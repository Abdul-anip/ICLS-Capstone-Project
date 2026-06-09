from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from services.judge0_service import evaluate_code
from services.bkt_service import calculate_new_state
import datetime

# Jeda waktu minimum (dalam detik) untuk menganggap percobaan pengerjaan sebagai sesi baru.
# Default: 24 jam (86400 detik). Untuk keperluan demo/sidang, nilai ini bisa diperkecil (misal 60 detik).
BKT_SESSION_JEDA_SECONDS = 24 * 3600

router = APIRouter(
    prefix="/api/evaluasi",
    tags=["Evaluasi Kode & BKT"]
)

@router.post("/submit", response_model=schemas.CodeEvaluationResponse)
def submit_code(submission: schemas.CodeSubmit, db: Session = Depends(get_db)):
    # 0. Validasi Kode Kosong atau Template Default
    code_stripped = submission.source_code.strip()
    if not code_stripped:
        raise HTTPException(status_code=400, detail="Kode tidak boleh kosong")
        
    TEMPLATES = [
        "",
        "# Tulis kodemu disini",
        "// Tulis kodemu disini",
        "<?php\n// Tulis kodemu disini\n\n?>",
        "#include <iostream>\nusing namespace std;\n\nint main() {\n    // Tulis kodemu disini\n    return 0;\n}",
        "public class Main {\n    public static void main(String[] args) {\n        // Tulis kodemu disini\n    }\n}"
    ]
    
    def normalize(s):
        return "".join(s.split()).lower()
        
    normalized_sub = normalize(code_stripped)
    if any(normalize(temp) == normalized_sub for temp in TEMPLATES):
        raise HTTPException(status_code=400, detail="Silakan lengkapi kode solusi Anda terlebih dahulu")

    # 1. Cari soal dan test case
    soal = db.query(models.Soal).filter(models.Soal.soal_id == submission.soal_id).first()
    if not soal:
        raise HTTPException(status_code=404, detail="Soal tidak ditemukan")
    
    # Ambil testcase pertama (untuk penyederhanaan contoh)
    testcase = db.query(models.TestCase).filter(models.TestCase.soal_id == submission.soal_id).first()
    expected_output = testcase.expected_output if testcase else ""
    input_data = testcase.input_data if testcase else ""

    # ─── DETEKSI KODE DUPLIKAT (Hanya untuk Submit Final) ────────────────────
    is_duplicate = False
    if not submission.is_test:
        # Cek apakah submit terakhir untuk soal ini dari siswa yang sama
        # memiliki source_code yang IDENTIK. Jika ya, tolak update BKT.
        last_eval = (
            db.query(models.Evaluasi)
            .filter(
                models.Evaluasi.siswa_id == submission.siswa_id,
                models.Evaluasi.soal_id == submission.soal_id,
            )
            .order_by(models.Evaluasi.timestamp.desc())
            .first()
        )

        is_duplicate = (
            last_eval is not None
            and last_eval.source_code.strip() == submission.source_code.strip()
        )

        if is_duplicate:
            # Kembalikan hasil submit sebelumnya TANPA menjalankan ulang Judge0
            # dan TANPA mengupdate state BKT — mencegah exploit P(L)
            bkt_record = db.query(models.BKTHistory).filter(
                models.BKTHistory.siswa_id == submission.siswa_id,
                models.BKTHistory.topik_id == soal.topik_id
            ).first()
            current_prob = bkt_record.learned_prob if bkt_record else 0.1

            return schemas.CodeEvaluationResponse(
                status_compile=last_eval.status_compile,
                is_correct=bool(last_eval.binary_result),
                output="[Kode identik dengan submit sebelumnya — BKT tidak diperbarui]",
                new_knowledge_state=current_prob,
                is_duplicate=True
            )
    # ─────────────────────────────────────────────────────────────────────────

    # 2. Panggil Judge0 API (Service)
    judge_result = evaluate_code(
        source_code=submission.source_code,
        language_id=submission.language_id,
        expected_output=expected_output,
        input_data=input_data
    )
    
    is_correct = judge_result["is_correct"]
    status_compile = judge_result["status"]

    # Ambil riwayat BKT siswa saat ini untuk topik ini
    bkt_record = db.query(models.BKTHistory).filter(
        models.BKTHistory.siswa_id == submission.siswa_id,
        models.BKTHistory.topik_id == soal.topik_id
    ).first()

    current_prob = bkt_record.learned_prob if bkt_record else 0.1

    if not submission.is_test:
        # 3. Panggil BKT Engine (Service) - Hanya untuk Submit Final
        # Ambil riwayat pengerjaan soal ini, diurutkan dari yang terbaru
        evals_history = db.query(models.Evaluasi).filter(
            models.Evaluasi.siswa_id == submission.siswa_id,
            models.Evaluasi.soal_id == submission.soal_id
        ).order_by(models.Evaluasi.timestamp.desc()).all()

        # Batasi riwayat pengerjaan hanya pada "Sesi Aktif" saat ini.
        # Jika ada jeda waktu pengerjaan yang melebihi BKT_SESSION_JEDA_SECONDS,
        # maka riwayat yang lebih lama dari jeda tersebut akan diabaikan (dianggap sesi lama).
        active_session_evals = []
        current_time = datetime.datetime.utcnow()
        prev_time = current_time

        for ev in evals_history:
            if (prev_time - ev.timestamp).total_seconds() > BKT_SESSION_JEDA_SECONDS:
                break
            active_session_evals.append(ev)
            prev_time = ev.timestamp

        already_solved = any(e.binary_result == 1 for e in active_session_evals)
        already_failed = any(e.binary_result == 0 for e in active_session_evals)
        
        should_update_bkt = False
        
        if is_correct:
            # Update BKT hanya jika belum pernah diselesaikan dengan benar sebelumnya
            if not already_solved:
                should_update_bkt = True
        else:
            # Update BKT jika belum pernah mencoba soal ini sama sekali (mencegah spam jawaban salah)
            if not already_solved and not already_failed:
                should_update_bkt = True

        if should_update_bkt:
            # Kalkulasi Knowledge State baru berdasarkan tingkat kesulitan soal
            new_knowledge_prob = calculate_new_state(
                current_prob=current_prob, 
                is_correct=is_correct, 
                tingkat_kesulitan=soal.tingkat_kesulitan
            )

            # Simpan atau update state BKT ke database
            if bkt_record:
                bkt_record.learned_prob = new_knowledge_prob
            else:
                # Buat record baru jika belum ada
                new_bkt = models.BKTHistory(
                    siswa_id=submission.siswa_id,
                    topik_id=soal.topik_id,
                    learned_prob=new_knowledge_prob
                )
                db.add(new_bkt)
            current_prob = new_knowledge_prob
        
        # 4. Simpan Log Evaluasi ke Database - Hanya untuk Submit Final
        eval_log = models.Evaluasi(
            siswa_id=submission.siswa_id,
            soal_id=submission.soal_id,
            source_code=submission.source_code,
            status_compile=status_compile,
            binary_result=1 if is_correct else 0
        )
        db.add(eval_log)
        
        # Commit seluruh transaksi database
        db.commit()

    # 5. Kembalikan Response
    return schemas.CodeEvaluationResponse(
        status_compile=status_compile,
        is_correct=is_correct,
        output=judge_result["output"],
        new_knowledge_state=current_prob,
        is_duplicate=False
    )


@router.get("/history/{user_id}", response_model=list[schemas.EvaluasiHistoryResponse])
def get_evaluasi_history(user_id: int, db: Session = Depends(get_db)):
    """Mengambil riwayat evaluasi / submit kode seorang siswa."""
    siswa = db.query(models.User).filter(models.User.user_id == user_id, models.User.role == 'siswa').first()
    if not siswa:
        raise HTTPException(status_code=404, detail="Siswa tidak ditemukan")

    riwayat = db.query(models.Evaluasi).filter(models.Evaluasi.siswa_id == user_id).order_by(models.Evaluasi.timestamp.desc()).all()
    
    result = []
    for r in riwayat:
        soal = db.query(models.Soal).filter(models.Soal.soal_id == r.soal_id).first()
        result.append(schemas.EvaluasiHistoryResponse(
            evaluasi_id=r.evaluasi_id,
            soal_id=r.soal_id,
            deskripsi_soal=(soal.judul_soal if soal.judul_soal else (soal.deskripsi_soal[:50] + "...")) if soal else "Unknown",
            status_compile=r.status_compile,
            binary_result=r.binary_result,
            timestamp=r.timestamp
        ))
        
    return result

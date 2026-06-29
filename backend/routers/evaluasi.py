from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from services.jdoodle_service import evaluate_code
from services.bkt_service import calculate_new_state, apply_bkt_decay, reload_ml_params
from services.ml_trainer import train_from_database, load_trained_params
from services.auth_service import get_current_user
import datetime

# Jeda waktu minimum (dalam detik) untuk menganggap percobaan pengerjaan sebagai sesi baru.
# Default: 24 jam (86400 detik). Untuk keperluan demo/sidang, nilai ini bisa diperkecil (misal 60 detik).
BKT_SESSION_JEDA_SECONDS = 24 * 3600

router = APIRouter(
    prefix="/api/evaluasi",
    tags=["Evaluasi Kode & BKT"]
)

@router.post("/submit", response_model=schemas.CodeEvaluationResponse)
def submit_code(
    submission: schemas.CodeSubmit,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Validasi: siswa hanya boleh submit untuk dirinya sendiri
    if current_user.user_id != submission.siswa_id:
        raise HTTPException(status_code=403, detail="Tidak diizinkan submit atas nama pengguna lain.")

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

    # 1. Cari soal
    soal = db.query(models.Soal).filter(models.Soal.soal_id == submission.soal_id).first()
    if not soal:
        raise HTTPException(status_code=404, detail="Soal tidak ditemukan")
    
    # Ambil semua testcase untuk soal ini
    testcases = db.query(models.TestCase).filter(models.TestCase.soal_id == submission.soal_id).all()
    
    # Ambil riwayat BKT siswa saat ini untuk topik ini
    bkt_record = db.query(models.BKTHistory).filter(
        models.BKTHistory.siswa_id == submission.siswa_id,
        models.BKTHistory.topik_id == soal.topik_id
    ).first()

    # Terapkan peluruhan BKT (forgetting curve) malas jika siswa sudah tidak aktif
    if bkt_record:
        current_prob = apply_bkt_decay(bkt_record, db)
    else:
        current_prob = 0.1

    # ─── DETEKSI KODE DUPLIKAT ────────────────────────────────────────────────
    is_duplicate = False
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
        return schemas.CodeEvaluationResponse(
            status_compile=last_eval.status_compile,
            is_correct=bool(last_eval.binary_result),
            output="[Kode identik dengan submit sebelumnya — BKT tidak diperbarui]",
            new_knowledge_state=current_prob,
            is_duplicate=True,
            passed_testcases=len(testcases) if last_eval.binary_result else 0,
            total_testcases=len(testcases)
        )
    # ─────────────────────────────────────────────────────────────────────────

    # 3. Mode Submit Final (Evaluasi Seluruh Test Case)
    passed_count = 0
    total_testcases = len(testcases)
    status_compile = "Accepted"
    is_correct = True
    output_summary = ""

    if total_testcases == 0:
        # Fallback jika tidak ada testcase di database
        judge_result = evaluate_code(
            source_code=submission.source_code,
            language_id=submission.language_id,
            expected_output=""
        )
        status_compile = judge_result["status"]
        is_correct = (status_compile == "Accepted")
        passed_count = 1 if is_correct else 0
        total_testcases = 1
        output_summary = judge_result["output"]
    else:
        for index, tc in enumerate(testcases):
            judge_result = evaluate_code(
                source_code=submission.source_code,
                language_id=submission.language_id,
                expected_output=tc.expected_output,
                input_data=tc.input_data
            )
            
            # Jika compile error atau runtime error, hentikan loop
            if judge_result["status"] in ["Runtime Error / Syntax Error", "API Error", "Connection Error"]:
                status_compile = judge_result["status"]
                is_correct = False
                output_summary = judge_result["output"]
                break
                
            if judge_result["is_correct"]:
                passed_count += 1
            else:
                is_correct = False
                # Ambil output kegagalan testcase pertama sebagai contoh feedback
                if not output_summary:
                    output_summary = f"Wrong Answer pada Testcase {index + 1}.\nOutput Anda:\n{judge_result['output']}"
        
        # Jika lolos kompilasi tapi ada yang salah, statusnya Wrong Answer
        if status_compile == "Accepted" and not is_correct:
            status_compile = "Wrong Answer"
            
        if is_correct:
            output_summary = "Seluruh testcase berhasil dilewati dengan sukses!"

    # 4. Logika BKT Dinamis Baru (Berdasarkan Transisi Hasil Submit Terakhir)
    last_result = last_eval.binary_result if last_eval else None
    current_result = 1 if is_correct else 0
    
    should_update_bkt = False
    
    if last_result is None:
        # Pengerjaan pertama kali (selalu update BKT)
        should_update_bkt = True
    elif last_result == 0 and current_result == 1:
        # Perbaikan: Dari Salah ke Benar (BKT naik)
        should_update_bkt = True
    elif last_result == 1 and current_result == 0:
        # Penurunan: Dari Benar ke Salah (BKT turun)
        should_update_bkt = True
    # Jika Benar -> Benar atau Salah -> Salah, should_update_bkt tetap False (mencegah spam)

    if should_update_bkt:
        # Hitung jumlah soal aktif dalam topik ini untuk BKT dinamis (hanya dari dosen instansi siswa yang sama)
        siswa = db.query(models.User).filter(models.User.user_id == submission.siswa_id).first()
        dosen_instansi = db.query(models.User.user_id).filter(
            models.User.instansi_id == siswa.instansi_id,
            models.User.role == 'dosen'
        ).subquery()

        num_soal = db.query(models.Soal).filter(
            models.Soal.topik_id == soal.topik_id,
            models.Soal.dosen_id.in_(dosen_instansi)
        ).count()

        # Kalkulasi Knowledge State baru berdasarkan tingkat kesulitan soal dan jumlah soal
        new_knowledge_prob = calculate_new_state(
            current_prob=current_prob, 
            is_correct=is_correct, 
            tingkat_kesulitan=soal.tingkat_kesulitan,
            num_soal=num_soal
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
    
    # 5. Simpan Log Evaluasi ke Database - Hanya untuk Submit Final
    eval_log = models.Evaluasi(
        siswa_id=submission.siswa_id,
        soal_id=submission.soal_id,
        source_code=submission.source_code,
        status_compile=status_compile,
        binary_result=current_result
    )
    db.add(eval_log)
    
    # Commit seluruh transaksi database
    db.commit()

    # 6. Kembalikan Response
    return schemas.CodeEvaluationResponse(
        status_compile=status_compile,
        is_correct=is_correct,
        output=output_summary,
        new_knowledge_state=current_prob,
        is_duplicate=False,
        passed_testcases=passed_count,
        total_testcases=total_testcases
    )


@router.get("/history/{user_id}", response_model=list[schemas.EvaluasiHistoryResponse])
def get_evaluasi_history(
    user_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mengambil riwayat evaluasi / submit kode seorang siswa."""
    # Siswa hanya bisa melihat riwayatnya sendiri; dosen/admin bisa melihat semua
    if current_user.role.value == 'siswa' and current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="Akses ditolak.")

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


@router.post("/train-ml")
def train_ml_model(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Endpoint Machine Learning: Melatih ulang parameter BKT dari seluruh data evaluasi.
    Hanya dapat diakses oleh dosen atau super_admin.
    
    Proses:
    1. Mengambil seluruh data dari tb_evaluasi + tb_soal.
    2. Mengelompokkan berdasarkan tingkat kesulitan (Mudah/Sedang/Sulit).
    3. Menjalankan algoritma optimasi MLE (scipy.optimize.minimize) untuk
       mencari parameter BKT (Prior, Learn, Guess, Slip) yang optimal.
    4. Menyimpan hasil ke file JSON dan memuat ulang ke memory server.
    """
    if current_user.role.value not in ['dosen', 'super_admin']:
        raise HTTPException(status_code=403, detail="Hanya dosen atau admin yang dapat melatih model ML.")
    
    result = train_from_database(db)
    
    # Muat ulang parameter ke BKT engine yang sedang berjalan di memory
    reload_ml_params()
    
    return {
        "message": result["message"],
        "status": result["status"],
        "trained_params": result["params"]
    }


@router.get("/ml-params")
def get_ml_params(
    current_user: models.User = Depends(get_current_user)
):
    """
    Menampilkan parameter BKT yang sedang digunakan oleh sistem.
    Berguna untuk debugging dan verifikasi bahwa ML Training telah berhasil.
    """
    if current_user.role.value not in ['dosen', 'super_admin']:
        raise HTTPException(status_code=403, detail="Akses ditolak.")
    
    params = load_trained_params()
    return {
        "current_params": params,
        "source": params.get("metadata", {}).get("source", "unknown")
    }

from services.jdoodle_service import check_credit

@router.get("/jdoodle-credit")
def get_jdoodle_credit(current_user: models.User = Depends(get_current_user)):
    """
    Mengambil sisa kuota (credit) JDoodle API yang sudah terpakai hari ini.
    """
    if current_user.role.value not in ['dosen', 'super_admin']:
        raise HTTPException(status_code=403, detail="Akses ditolak")
        
    result = check_credit()
    if result.get("status") == "error":
        raise HTTPException(status_code=500, detail=result.get("message", "Gagal mengecek kuota"))
        
    return {"used": result.get("used", 0), "total": result.get("total", 0)}

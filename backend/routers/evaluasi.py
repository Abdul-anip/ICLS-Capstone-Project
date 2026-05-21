from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from services.judge0_service import evaluate_code
from services.bkt_service import calculate_new_state

router = APIRouter(
    prefix="/api/evaluasi",
    tags=["Evaluasi Kode & BKT"]
)

@router.post("/submit", response_model=schemas.CodeEvaluationResponse)
def submit_code(submission: schemas.CodeSubmit, db: Session = Depends(get_db)):
    # 1. Cari soal dan test case
    soal = db.query(models.Soal).filter(models.Soal.soal_id == submission.soal_id).first()
    if not soal:
        raise HTTPException(status_code=404, detail="Soal tidak ditemukan")
    
    # Ambil testcase pertama (untuk penyederhanaan contoh)
    testcase = db.query(models.TestCase).filter(models.TestCase.soal_id == submission.soal_id).first()
    expected_output = testcase.expected_output if testcase else ""
    input_data = testcase.input_data if testcase else ""

    # 2. Panggil Judge0 API (Service)
    judge_result = evaluate_code(
        source_code=submission.source_code,
        language_id=submission.language_id,
        expected_output=expected_output,
        input_data=input_data
    )
    
    is_correct = judge_result["is_correct"]
    status_compile = judge_result["status"]

    # 3. Panggil BKT Engine (Service)
    # Ambil riwayat BKT siswa saat ini untuk topik ini
    bkt_record = db.query(models.BKTHistory).filter(
        models.BKTHistory.siswa_id == submission.siswa_id,
        models.BKTHistory.topik_id == soal.topik_id
    ).first()

    current_prob = bkt_record.learned_prob if bkt_record else 0.1
    
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
    
    # 4. Simpan Log Evaluasi ke Database
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
        new_knowledge_state=new_knowledge_prob
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
            deskripsi_soal=soal.deskripsi_soal[:50] + "..." if soal else "Unknown",
            status_compile=r.status_compile,
            binary_result=r.binary_result,
            timestamp=r.timestamp
        ))
        
    return result

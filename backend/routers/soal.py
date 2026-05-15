from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas

router = APIRouter(
    prefix="/api/soal",
    tags=["Manajemen Soal"]
)

@router.post("/", response_model=schemas.SoalResponse)
def create_soal_with_testcase(payload: schemas.SoalWithTestCaseCreate, db: Session = Depends(get_db)):
    # Verifikasi Topik dan Dosen
    topik = db.query(models.TopikMateri).filter(models.TopikMateri.topik_id == payload.topik_id).first()
    if not topik:
        raise HTTPException(status_code=404, detail="Topik tidak ditemukan")
        
    user = db.query(models.User).filter(models.User.user_id == payload.dosen_id, models.User.role == 'dosen').first()
    if not user:
        raise HTTPException(status_code=403, detail="Hanya Dosen yang berhak membuat soal")

    # Buat Soal
    db_soal = models.Soal(
        topik_id=payload.topik_id,
        dosen_id=payload.dosen_id,
        deskripsi_soal=payload.deskripsi_soal,
        tingkat_kesulitan=payload.tingkat_kesulitan
    )
    db.add(db_soal)
    db.commit()
    db.refresh(db_soal)

    # Buat Test Case
    for tc in payload.testcases:
        db_testcase = models.TestCase(
            soal_id=db_soal.soal_id,
            input_data=tc.input_data,
            expected_output=tc.expected_output,
            is_hidden=False
        )
        db.add(db_testcase)
    
    db.commit()
    
    return db_soal

@router.get("/")
def get_all_soal(db: Session = Depends(get_db)):
    soal_list = db.query(models.Soal).all()
    result = []
    for s in soal_list:
        testcases = db.query(models.TestCase).filter(models.TestCase.soal_id == s.soal_id).all()
        result.append({
            "soal_id": s.soal_id,
            "topik_id": s.topik_id,
            "deskripsi_soal": s.deskripsi_soal,
            "tingkat_kesulitan": s.tingkat_kesulitan,
            "testcases": testcases
        })
    return result

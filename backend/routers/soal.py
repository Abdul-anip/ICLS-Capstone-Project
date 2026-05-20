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

@router.get("/topik")
def get_all_topik(db: Session = Depends(get_db)):
    """Mengambil seluruh daftar Topik Materi dari database."""
    topik_list = db.query(models.TopikMateri).all()
    return [
        {
            "topik_id": t.topik_id,
            "nama_topik": t.nama_topik,
            "deskripsi": t.deskripsi
        }
        for t in topik_list
    ]

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

@router.put("/{soal_id}", response_model=schemas.SoalResponse)
def update_soal(soal_id: int, payload: schemas.SoalWithTestCaseUpdate, db: Session = Depends(get_db)):
    soal = db.query(models.Soal).filter(models.Soal.soal_id == soal_id).first()
    if not soal:
        raise HTTPException(status_code=404, detail="Soal tidak ditemukan")
    
    # Update atribut soal
    soal.topik_id = payload.topik_id
    soal.deskripsi_soal = payload.deskripsi_soal
    soal.tingkat_kesulitan = payload.tingkat_kesulitan
    
    # Hapus semua test case lama
    db.query(models.TestCase).filter(models.TestCase.soal_id == soal_id).delete()
    
    # Masukkan test case baru
    for tc in payload.testcases:
        db_testcase = models.TestCase(
            soal_id=soal_id,
            input_data=tc.input_data,
            expected_output=tc.expected_output,
            is_hidden=False
        )
        db.add(db_testcase)
        
    db.commit()
    db.refresh(soal)
    return soal

@router.delete("/{soal_id}")
def delete_soal(soal_id: int, db: Session = Depends(get_db)):
    soal = db.query(models.Soal).filter(models.Soal.soal_id == soal_id).first()
    if not soal:
        raise HTTPException(status_code=404, detail="Soal tidak ditemukan")
        
    # Hapus evaluasi yang terikat dengan soal ini (supaya tidak melanggar foreign key constraints)
    db.query(models.Evaluasi).filter(models.Evaluasi.soal_id == soal_id).delete()
    
    # Hapus testcase yang terikat
    db.query(models.TestCase).filter(models.TestCase.soal_id == soal_id).delete()
    
    # Hapus soal
    db.delete(soal)
    db.commit()
    return {"message": "Soal beserta riwayat evaluasi dan test case berhasil dihapus"}


@router.get("/siswa/{user_id}")
def get_soal_siswa(user_id: int, db: Session = Depends(get_db)):
    """Mengambil daftar soal untuk siswa beserta nama topik dan state BKT saat ini."""
    siswa = db.query(models.User).filter(models.User.user_id == user_id, models.User.role == 'siswa').first()
    if not siswa:
        raise HTTPException(status_code=404, detail="Siswa tidak ditemukan")

    # Ambil dosen yang ada di instansi yang sama dengan siswa
    dosen_instansi = db.query(models.User.user_id).filter(
        models.User.instansi_id == siswa.instansi_id,
        models.User.role == 'dosen'
    ).subquery()

    # Ambil soal yang dibuat oleh dosen-dosen tersebut
    soal_list = db.query(models.Soal).filter(models.Soal.dosen_id.in_(dosen_instansi)).all()

    result = []
    for s in soal_list:
        # Ambil nama topik
        topik = db.query(models.TopikMateri).filter(models.TopikMateri.topik_id == s.topik_id).first()
        nama_topik = topik.nama_topik if topik else "Topik Tidak Diketahui"

        # Ambil state BKT terakhir untuk siswa dan topik ini
        bkt_record = db.query(models.BKTHistory).filter(
            models.BKTHistory.siswa_id == user_id,
            models.BKTHistory.topik_id == s.topik_id
        ).first()
        
        learned_prob = bkt_record.learned_prob if bkt_record else 0.1

        result.append({
            "soal_id": s.soal_id,
            "topik_id": s.topik_id,
            "nama_topik": nama_topik,
            "deskripsi_soal": s.deskripsi_soal,
            "tingkat_kesulitan": s.tingkat_kesulitan,
            "learned_prob": learned_prob
        })
        
    return result

@router.get("/siswa/{user_id}/bkt-stats", response_model=list[schemas.BKTStatsResponse])
def get_bkt_stats(user_id: int, db: Session = Depends(get_db)):
    """Mengambil state BKT terakhir untuk setiap topik yang pernah dikerjakan oleh siswa."""
    siswa = db.query(models.User).filter(models.User.user_id == user_id, models.User.role == 'siswa').first()
    if not siswa:
        raise HTTPException(status_code=404, detail="Siswa tidak ditemukan")

    # Ambil semua topik yang ada (ideal: ambil topik yang ada soalnya di instansi siswa)
    dosen_instansi = db.query(models.User.user_id).filter(
        models.User.instansi_id == siswa.instansi_id,
        models.User.role == 'dosen'
    ).subquery()
    
    soal_instansi = db.query(models.Soal.topik_id).filter(models.Soal.dosen_id.in_(dosen_instansi)).distinct().all()
    topik_ids = [s.topik_id for s in soal_instansi]

    result = []
    for t_id in topik_ids:
        topik = db.query(models.TopikMateri).filter(models.TopikMateri.topik_id == t_id).first()
        bkt_record = db.query(models.BKTHistory).filter(
            models.BKTHistory.siswa_id == user_id,
            models.BKTHistory.topik_id == t_id
        ).first()
        
        result.append(schemas.BKTStatsResponse(
            topik_id=t_id,
            nama_topik=topik.nama_topik if topik else "Topik Unknown",
            learned_prob=bkt_record.learned_prob if bkt_record else 0.1
        ))

    return result

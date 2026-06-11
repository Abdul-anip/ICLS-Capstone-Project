from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas

router = APIRouter(
    prefix="/api/kelas",
    tags=["Kelas & Kurikulum"]
)

@router.get("/by-code", response_model=list[schemas.KelasResponse])
def get_kelas_by_code(kode_instansi: str, db: Session = Depends(get_db)):
    """Mendapatkan daftar kelas berdasarkan kode instansi (dipakai di pendaftaran siswa)."""
    instansi = db.query(models.Instansi).filter(
        models.Instansi.kode_instansi == kode_instansi.upper()
    ).first()
    if not instansi:
        raise HTTPException(status_code=404, detail="Instansi tidak ditemukan.")
    
    return db.query(models.Kelas).filter(
        models.Kelas.instansi_id == instansi.instansi_id
    ).all()

@router.get("/my-classes", response_model=list[schemas.KelasResponse])
def get_dosen_kelas(dosen_id: int, db: Session = Depends(get_db)):
    """Mendapatkan daftar kelas yang dipantau/diampu oleh dosen tertentu."""
    dosen = db.query(models.User).filter(
        models.User.user_id == dosen_id, 
        models.User.role == models.RoleEnum.dosen
    ).first()
    if not dosen:
        raise HTTPException(status_code=404, detail="Dosen tidak ditemukan.")
    
    return dosen.kelas_diampu

@router.post("/my-classes")
def update_dosen_kelas(payload: schemas.DosenKelasUpdate, db: Session = Depends(get_db)):
    """Memperbarui daftar kelas yang ingin dipantau/diampu oleh dosen."""
    dosen = db.query(models.User).filter(
        models.User.user_id == payload.dosen_id,
        models.User.role == models.RoleEnum.dosen
    ).first()
    if not dosen:
        raise HTTPException(status_code=404, detail="Dosen tidak ditemukan.")
    
    # Ambil kelas yang dipilih yang sesuai dengan instansi dosen saja
    kelas_list = db.query(models.Kelas).filter(
        models.Kelas.kelas_id.in_(payload.kelas_ids),
        models.Kelas.instansi_id == dosen.instansi_id
    ).all()
    
    dosen.kelas_diampu = kelas_list
    db.commit()
    return {"message": "Daftar kelas pantauan berhasil diperbarui."}

@router.get("/instansi", response_model=list[schemas.KelasResponse])
def get_kelas_by_instansi(instansi_id: int, db: Session = Depends(get_db)):
    """Mengambil semua kelas dalam instansi tertentu."""
    return db.query(models.Kelas).filter(
        models.Kelas.instansi_id == instansi_id
    ).all()

@router.post("", response_model=schemas.KelasResponse)
def create_kelas(payload: schemas.KelasCreate, db: Session = Depends(get_db)):
    """Membuat kelas baru pada instansi tertentu."""
    # Verifikasi keunikan kelas per instansi
    existing = db.query(models.Kelas).filter(
        models.Kelas.nama_kelas == payload.nama_kelas.strip(),
        models.Kelas.instansi_id == payload.instansi_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Kelas sudah terdaftar di instansi ini.")
    
    new_kelas = models.Kelas(
        nama_kelas=payload.nama_kelas.strip(),
        instansi_id=payload.instansi_id
    )
    db.add(new_kelas)
    db.commit()
    db.refresh(new_kelas)
    return new_kelas

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas

router = APIRouter(
    prefix="/api/instansi",
    tags=["Manajemen Instansi"]
)


@router.get("/", response_model=list[schemas.InstansiResponse])
def get_all_instansi(db: Session = Depends(get_db)):
    """Endpoint publik: daftar semua instansi (untuk keperluan lain jika dibutuhkan)."""
    return db.query(models.Instansi).all()


@router.post("/", response_model=schemas.InstansiResponse)
def create_instansi(payload: schemas.InstansiCreate, super_admin_id: int, db: Session = Depends(get_db)):
    """Hanya super_admin yang boleh membuat instansi baru."""
    admin = db.query(models.User).filter(
        models.User.user_id == super_admin_id,
        models.User.role == models.RoleEnum.super_admin
    ).first()
    if not admin:
        raise HTTPException(status_code=403, detail="Hanya Super Admin yang dapat membuat instansi.")

    # Cek apakah kode instansi sudah dipakai
    existing = db.query(models.Instansi).filter(models.Instansi.kode_instansi == payload.kode_instansi).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Kode instansi '{payload.kode_instansi}' sudah digunakan.")

    instansi = models.Instansi(
        nama_instansi=payload.nama_instansi,
        kode_instansi=payload.kode_instansi.upper(),
        alamat=payload.alamat
    )
    db.add(instansi)
    db.commit()
    db.refresh(instansi)
    return instansi

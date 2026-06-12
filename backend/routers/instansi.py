from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from services.auth_service import get_current_user, require_role

router = APIRouter(
    prefix="/api/instansi",
    tags=["Manajemen Instansi"]
)


@router.get("/", response_model=list[schemas.InstansiResponse])
def get_all_instansi(db: Session = Depends(get_db)):
    """Endpoint publik: daftar semua instansi (dibutuhkan saat registrasi siswa)."""
    return db.query(models.Instansi).all()


@router.post("/", response_model=schemas.InstansiResponse)
def create_instansi(
    payload: schemas.InstansiCreate,
    current_user: models.User = Depends(require_role("super_admin")),
    db: Session = Depends(get_db)
):
    """Hanya super_admin yang boleh membuat instansi baru."""
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

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas

router = APIRouter(
    prefix="/api/auth",
    tags=["Autentikasi"]
)

@router.post("/login", response_model=schemas.UserLoginResponse)
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    # Cari user berdasarkan username
    user = db.query(models.User).filter(models.User.username == payload.username).first()

    # Validasi: user tidak ditemukan atau password salah
    if not user or user.password_hash != payload.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username atau kata sandi salah. Silakan coba lagi."
        )

    return schemas.UserLoginResponse(
        user_id=user.user_id,
        username=user.username,
        nama_lengkap=user.nama_lengkap,
        role=user.role,
        instansi_kelas=user.instansi_kelas
    )

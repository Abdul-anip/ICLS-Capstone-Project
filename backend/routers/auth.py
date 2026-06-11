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
    """Login untuk semua role (siswa, dosen, super_admin)."""
    user = db.query(models.User).filter(models.User.username == payload.username).first()

    if not user or user.password_hash != payload.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username atau kata sandi salah. Silakan coba lagi."
        )

    # Ambil nama instansi jika user bukan super_admin
    nama_instansi = None
    if user.instansi:
        nama_instansi = user.instansi.nama_instansi

    nama_kelas = user.kelas.nama_kelas if user.kelas else None

    return schemas.UserLoginResponse(
        user_id=user.user_id,
        username=user.username,
        nama_lengkap=user.nama_lengkap,
        role=user.role,
        kelas_id=user.kelas_id,
        nama_kelas=nama_kelas,
        instansi_id=user.instansi_id,
        nama_instansi=nama_instansi
    )


@router.post("/register", response_model=schemas.UserLoginResponse, status_code=status.HTTP_201_CREATED)
def register_siswa(payload: schemas.UserRegister, db: Session = Depends(get_db)):
    """Registrasi mandiri untuk siswa menggunakan kode instansi."""

    # 1. Validasi kode instansi
    instansi = db.query(models.Instansi).filter(
        models.Instansi.kode_instansi == payload.kode_instansi.upper()
    ).first()
    if not instansi:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Kode instansi '{payload.kode_instansi}' tidak ditemukan. Pastikan kode yang Anda masukkan benar."
        )

    # 2. Validasi username unik
    existing_user = db.query(models.User).filter(models.User.username == payload.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Username '{payload.username}' sudah digunakan. Silakan pilih username lain."
        )

    # 3. Buat akun siswa baru
    new_user = models.User(
        username=payload.username,
        password_hash=payload.password,   # plaintext untuk prototype
        role=models.RoleEnum.siswa,
        nama_lengkap=payload.nama_lengkap,
        kelas_id=payload.kelas_id,
        instansi_id=instansi.instansi_id
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Ambil nama kelas untuk response
    kelas = db.query(models.Kelas).filter(models.Kelas.kelas_id == new_user.kelas_id).first()
    nama_kelas = kelas.nama_kelas if kelas else None

    return schemas.UserLoginResponse(
        user_id=new_user.user_id,
        username=new_user.username,
        nama_lengkap=new_user.nama_lengkap,
        role=new_user.role,
        kelas_id=new_user.kelas_id,
        nama_kelas=nama_kelas,
        instansi_id=instansi.instansi_id,
        nama_instansi=instansi.nama_instansi
    )

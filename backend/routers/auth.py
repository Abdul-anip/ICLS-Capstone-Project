from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from services.auth_service import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)

router = APIRouter(
    prefix="/api/auth",
    tags=["Autentikasi"]
)


@router.post("/login", response_model=schemas.TokenResponse)
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    """Login untuk semua role (siswa, dosen, super_admin). Mengembalikan JWT access token."""
    user = db.query(models.User).filter(models.User.username == payload.username).first()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username atau kata sandi salah. Silakan coba lagi."
        )

    # Buat JWT token dengan payload: user_id (sub) dan role
    access_token = create_access_token(data={"sub": user.user_id, "role": user.role.value})

    nama_instansi = user.instansi.nama_instansi if user.instansi else None
    nama_kelas = user.kelas.nama_kelas if user.kelas else None

    return schemas.TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=user.user_id,
        username=user.username,
        nama_lengkap=user.nama_lengkap,
        role=user.role.value,
        kelas_id=user.kelas_id,
        nama_kelas=nama_kelas,
        instansi_id=user.instansi_id,
        nama_instansi=nama_instansi
    )


@router.post("/register", response_model=schemas.TokenResponse, status_code=status.HTTP_201_CREATED)
def register_siswa(payload: schemas.UserRegister, db: Session = Depends(get_db)):
    """Registrasi mandiri untuk siswa menggunakan kode instansi. Langsung mengembalikan JWT token."""

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

    # 3. Buat akun siswa baru dengan password yang di-hash bcrypt
    new_user = models.User(
        username=payload.username,
        password_hash=hash_password(payload.password),
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

    # Langsung buat dan kembalikan JWT token agar siswa tidak perlu login ulang setelah daftar
    access_token = create_access_token(data={"sub": new_user.user_id, "role": "siswa"})

    return schemas.TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=new_user.user_id,
        username=new_user.username,
        nama_lengkap=new_user.nama_lengkap,
        role="siswa",
        kelas_id=new_user.kelas_id,
        nama_kelas=nama_kelas,
        instansi_id=instansi.instansi_id,
        nama_instansi=instansi.nama_instansi
    )


@router.get("/me", response_model=schemas.UserLoginResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    """Mengambil data profil user yang sedang login berdasarkan JWT token."""
    nama_instansi = current_user.instansi.nama_instansi if current_user.instansi else None
    nama_kelas = current_user.kelas.nama_kelas if current_user.kelas else None
    return schemas.UserLoginResponse(
        user_id=current_user.user_id,
        username=current_user.username,
        nama_lengkap=current_user.nama_lengkap,
        role=current_user.role.value,
        kelas_id=current_user.kelas_id,
        nama_kelas=nama_kelas,
        instansi_id=current_user.instansi_id,
        nama_instansi=nama_instansi
    )

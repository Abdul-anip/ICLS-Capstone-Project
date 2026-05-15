from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas

router = APIRouter(
    prefix="/api/users",
    tags=["Manajemen Pengguna"]
)


@router.get("/me/{user_id}", response_model=schemas.UserLoginResponse)
def get_my_profile(user_id: int, db: Session = Depends(get_db)):
    """Mengambil profil user yang sedang login."""
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan.")

    nama_instansi = user.instansi.nama_instansi if user.instansi else None
    return schemas.UserLoginResponse(
        user_id=user.user_id,
        username=user.username,
        nama_lengkap=user.nama_lengkap,
        role=user.role,
        nama_kelas=user.nama_kelas,
        instansi_id=user.instansi_id,
        nama_instansi=nama_instansi
    )


@router.put("/me/{user_id}", response_model=schemas.UserLoginResponse)
def update_my_profile(user_id: int, payload: schemas.UserUpdate, db: Session = Depends(get_db)):
    """Memperbarui nama lengkap dan/atau nama kelas."""
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan.")

    if payload.nama_lengkap is not None:
        user.nama_lengkap = payload.nama_lengkap
    if payload.nama_kelas is not None:
        user.nama_kelas = payload.nama_kelas

    db.commit()
    db.refresh(user)

    nama_instansi = user.instansi.nama_instansi if user.instansi else None
    return schemas.UserLoginResponse(
        user_id=user.user_id,
        username=user.username,
        nama_lengkap=user.nama_lengkap,
        role=user.role,
        nama_kelas=user.nama_kelas,
        instansi_id=user.instansi_id,
        nama_instansi=nama_instansi
    )


@router.put("/me/{user_id}/password")
def change_password(user_id: int, payload: schemas.PasswordChange, db: Session = Depends(get_db)):
    """Mengubah password user setelah memvalidasi password lama."""
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan.")

    if user.password_hash != payload.password_lama:
        raise HTTPException(status_code=400, detail="Password lama salah.")

    user.password_hash = payload.password_baru
    db.commit()
    return {"message": "Password berhasil diperbarui."}


@router.post("/dosen", response_model=schemas.UserListResponse, status_code=status.HTTP_201_CREATED)
def create_dosen(payload: schemas.DosenCreate, requestor_id: int, db: Session = Depends(get_db)):
    """Dosen membuat akun dosen baru di instansinya sendiri."""
    requestor = db.query(models.User).filter(models.User.user_id == requestor_id).first()
    if not requestor or requestor.role not in [models.RoleEnum.dosen, models.RoleEnum.super_admin]:
        raise HTTPException(status_code=403, detail="Hanya Dosen atau Super Admin yang dapat mendaftarkan dosen baru.")

    # Validasi username unik
    existing = db.query(models.User).filter(models.User.username == payload.username).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Username '{payload.username}' sudah digunakan.")

    new_dosen = models.User(
        username=payload.username,
        password_hash=payload.password,
        role=models.RoleEnum.dosen,
        nama_lengkap=payload.nama_lengkap,
        instansi_id=requestor.instansi_id  # Otomatis ikut instansi dosen yang mendaftarkan
    )
    db.add(new_dosen)
    db.commit()
    db.refresh(new_dosen)
    return new_dosen


@router.get("/siswa", response_model=list[schemas.UserListResponse])
def get_all_siswa(requestor_id: int, db: Session = Depends(get_db)):
    """Dosen melihat daftar siswa di instansinya sendiri."""
    requestor = db.query(models.User).filter(models.User.user_id == requestor_id).first()
    if not requestor or requestor.role not in [models.RoleEnum.dosen, models.RoleEnum.super_admin]:
        raise HTTPException(status_code=403, detail="Akses ditolak.")

    # Filter siswa hanya dari instansi yang sama
    siswa_list = db.query(models.User).filter(
        models.User.instansi_id == requestor.instansi_id,
        models.User.role == models.RoleEnum.siswa
    ).all()
    return siswa_list

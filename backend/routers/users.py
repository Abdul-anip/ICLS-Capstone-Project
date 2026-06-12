from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from services.auth_service import (
    get_current_user,
    require_role,
    verify_password,
    hash_password,
)

router = APIRouter(
    prefix="/api/users",
    tags=["Manajemen Pengguna"]
)


@router.get("/me/{user_id}", response_model=schemas.UserLoginResponse)
def get_my_profile(
    user_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mengambil profil user yang sedang login. Siswa hanya bisa melihat profil diri sendiri."""
    # Siswa hanya boleh akses data dirinya sendiri
    if current_user.role.value == 'siswa' and current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="Akses ditolak.")

    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan.")

    nama_instansi = user.instansi.nama_instansi if user.instansi else None
    nama_kelas = user.kelas.nama_kelas if user.kelas else None
    return schemas.UserLoginResponse(
        user_id=user.user_id,
        username=user.username,
        nama_lengkap=user.nama_lengkap,
        role=user.role.value,
        kelas_id=user.kelas_id,
        nama_kelas=nama_kelas,
        instansi_id=user.instansi_id,
        nama_instansi=nama_instansi
    )


@router.put("/me/{user_id}", response_model=schemas.UserLoginResponse)
def update_my_profile(
    user_id: int,
    payload: schemas.UserUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Memperbarui nama lengkap. Siswa hanya bisa update profil dirinya sendiri."""
    if current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="Tidak diizinkan mengubah profil pengguna lain.")

    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan.")

    if payload.nama_lengkap is not None:
        user.nama_lengkap = payload.nama_lengkap
    # Kelas tidak bisa diubah sendiri oleh siswa — kelas bersifat permanen setelah registrasi

    db.commit()
    db.refresh(user)

    nama_instansi = user.instansi.nama_instansi if user.instansi else None
    nama_kelas = user.kelas.nama_kelas if user.kelas else None
    return schemas.UserLoginResponse(
        user_id=user.user_id,
        username=user.username,
        nama_lengkap=user.nama_lengkap,
        role=user.role.value,
        kelas_id=user.kelas_id,
        nama_kelas=nama_kelas,
        instansi_id=user.instansi_id,
        nama_instansi=nama_instansi
    )


@router.put("/me/{user_id}/password")
def change_password(
    user_id: int,
    payload: schemas.PasswordChange,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mengubah password user setelah memvalidasi password lama (bcrypt)."""
    if current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="Tidak diizinkan mengubah password pengguna lain.")

    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan.")

    if not verify_password(payload.password_lama, user.password_hash):
        raise HTTPException(status_code=400, detail="Password lama salah.")

    user.password_hash = hash_password(payload.password_baru)
    db.commit()
    return {"message": "Password berhasil diperbarui."}


@router.post("/dosen", response_model=schemas.UserListResponse, status_code=status.HTTP_201_CREATED)
def create_dosen(
    payload: schemas.DosenCreate,
    current_user: models.User = Depends(require_role("dosen", "super_admin")),
    db: Session = Depends(get_db)
):
    """Dosen membuat akun dosen baru di instansinya sendiri."""
    # Validasi username unik
    existing = db.query(models.User).filter(models.User.username == payload.username).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Username '{payload.username}' sudah digunakan.")

    new_dosen = models.User(
        username=payload.username,
        password_hash=hash_password(payload.password),
        role=models.RoleEnum.dosen,
        nama_lengkap=payload.nama_lengkap,
        instansi_id=current_user.instansi_id  # Otomatis ikut instansi dosen yang mendaftarkan
    )
    db.add(new_dosen)
    db.commit()
    db.refresh(new_dosen)
    return new_dosen


@router.post("/admin-create-dosen", response_model=schemas.UserListResponse, status_code=status.HTTP_201_CREATED)
def admin_create_dosen(
    payload: schemas.AdminDosenCreate,
    current_user: models.User = Depends(require_role("super_admin")),
    db: Session = Depends(get_db)
):
    """Super Admin membuat akun dosen untuk suatu instansi tertentu."""
    # Validasi instansi exist
    instansi = db.query(models.Instansi).filter(models.Instansi.instansi_id == payload.instansi_id).first()
    if not instansi:
        raise HTTPException(status_code=404, detail="Instansi tidak ditemukan.")

    # Validasi username unik
    existing = db.query(models.User).filter(models.User.username == payload.username).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Username '{payload.username}' sudah digunakan.")

    new_dosen = models.User(
        username=payload.username,
        password_hash=hash_password(payload.password),
        role=models.RoleEnum.dosen,
        nama_lengkap=payload.nama_lengkap,
        instansi_id=payload.instansi_id
    )
    db.add(new_dosen)
    db.commit()
    db.refresh(new_dosen)
    return new_dosen


@router.get("/siswa", response_model=list[schemas.UserListResponse])
def get_all_siswa(
    current_user: models.User = Depends(require_role("dosen", "super_admin")),
    db: Session = Depends(get_db)
):
    """Dosen melihat daftar siswa di instansinya sendiri."""
    siswa_filter = (
        models.User.instansi_id == current_user.instansi_id,
        models.User.role == models.RoleEnum.siswa
    )
    if current_user.role.value == 'dosen':
        kelas_diampu_ids = [k.kelas_id for k in current_user.kelas_diampu]
        if not kelas_diampu_ids:
            return []
        siswa_filter = (
            models.User.instansi_id == current_user.instansi_id,
            models.User.role == models.RoleEnum.siswa,
            models.User.kelas_id.in_(kelas_diampu_ids)
        )

    siswa_list = db.query(models.User).filter(*siswa_filter).all()
    return siswa_list


@router.get("/dosen-list", response_model=list[schemas.UserListResponse])
def get_all_dosen(
    current_user: models.User = Depends(require_role("dosen", "super_admin")),
    db: Session = Depends(get_db)
):
    """Dosen melihat daftar semua dosen di instansinya sendiri."""
    dosen_list = db.query(models.User).filter(
        models.User.instansi_id == current_user.instansi_id,
        models.User.role == models.RoleEnum.dosen
    ).all()
    return dosen_list


@router.get("/siswa-progress")
def get_siswa_progress(
    current_user: models.User = Depends(require_role("dosen", "super_admin")),
    db: Session = Depends(get_db)
):
    """Dosen melihat daftar siswa beserta rata-rata BKT per topik di instansinya."""
    siswa_filter = (
        models.User.instansi_id == current_user.instansi_id,
        models.User.role == models.RoleEnum.siswa
    )
    if current_user.role.value == 'dosen':
        kelas_diampu_ids = [k.kelas_id for k in current_user.kelas_diampu]
        if not kelas_diampu_ids:
            return []
        siswa_filter = (
            models.User.instansi_id == current_user.instansi_id,
            models.User.role == models.RoleEnum.siswa,
            models.User.kelas_id.in_(kelas_diampu_ids)
        )

    siswa_list = db.query(models.User).filter(*siswa_filter).all()

    result = []
    for siswa in siswa_list:
        bkt_records = db.query(models.BKTHistory).filter(
            models.BKTHistory.siswa_id == siswa.user_id
        ).all()

        avg_bkt = 0.0
        if bkt_records:
            avg_bkt = sum(r.learned_prob for r in bkt_records) / len(bkt_records)

        latest_bkt = max(bkt_records, key=lambda r: r.updated_at, default=None)
        topik_terakhir = None
        if latest_bkt:
            topik = db.query(models.TopikMateri).filter(
                models.TopikMateri.topik_id == latest_bkt.topik_id
            ).first()
            topik_terakhir = topik.nama_topik if topik else None

        jumlah_submit = db.query(models.Evaluasi).filter(
            models.Evaluasi.siswa_id == siswa.user_id
        ).count()

        perlu_perhatian = any(r.learned_prob < 0.4 for r in bkt_records) if bkt_records else False

        result.append({
            "user_id": siswa.user_id,
            "nama_lengkap": siswa.nama_lengkap,
            "username": siswa.username,
            "nama_kelas": siswa.nama_kelas,
            "avg_bkt": round(avg_bkt, 4),
            "topik_terakhir": topik_terakhir,
            "jumlah_submit": jumlah_submit,
            "perlu_perhatian": perlu_perhatian,
        })

    return result


@router.get("/dashboard-stats")
def get_dashboard_stats(
    current_user: models.User = Depends(require_role("dosen", "super_admin")),
    db: Session = Depends(get_db)
):
    """Statistik ringkasan untuk dashboard dosen: total siswa, soal, dan rata-rata BKT kelas."""
    siswa_filter = (
        models.User.instansi_id == current_user.instansi_id,
        models.User.role == models.RoleEnum.siswa
    )
    if current_user.role.value == 'dosen':
        kelas_diampu_ids = [k.kelas_id for k in current_user.kelas_diampu]
        if not kelas_diampu_ids:
            return {
                "total_siswa": 0,
                "total_soal": 0,
                "avg_bkt_kelas": 0.0,
                "topik_tersulit": None,
                "topik_chart_data": [],
                "is_scoped_empty": True
            }
        siswa_filter = (
            models.User.instansi_id == current_user.instansi_id,
            models.User.role == models.RoleEnum.siswa,
            models.User.kelas_id.in_(kelas_diampu_ids)
        )

    total_siswa = db.query(models.User).filter(*siswa_filter).count()

    dosen_ids = [u.user_id for u in db.query(models.User).filter(
        models.User.instansi_id == current_user.instansi_id,
        models.User.role == models.RoleEnum.dosen
    ).all()]
    total_soal = db.query(models.Soal).filter(
        models.Soal.dosen_id.in_(dosen_ids)
    ).count() if dosen_ids else 0

    siswa_ids = [u.user_id for u in db.query(models.User).filter(*siswa_filter).all()]
    all_bkt = db.query(models.BKTHistory).filter(
        models.BKTHistory.siswa_id.in_(siswa_ids)
    ).all() if siswa_ids else []

    avg_bkt_kelas = 0.0
    if all_bkt:
        avg_bkt_kelas = sum(r.learned_prob for r in all_bkt) / len(all_bkt)

    topik_stats = {}
    for bkt in all_bkt:
        if bkt.topik_id not in topik_stats:
            topik_stats[bkt.topik_id] = []
        topik_stats[bkt.topik_id].append(bkt.learned_prob)

    topik_tersulit = None
    topik_chart_data = []

    if topik_stats:
        topik_id_tersulit = min(topik_stats, key=lambda t: sum(topik_stats[t]) / len(topik_stats[t]))
        topik_ids = list(topik_stats.keys())
        topik_objs = db.query(models.TopikMateri).filter(models.TopikMateri.topik_id.in_(topik_ids)).all()
        topik_dict = {t.topik_id: t.nama_topik for t in topik_objs}

        for tid, probs in topik_stats.items():
            avg_t = sum(probs) / len(probs)
            nama_t = topik_dict.get(tid, f"Topik {tid}")
            topik_chart_data.append({"nama": nama_t, "avg_bkt": round(avg_t, 4)})
            if tid == topik_id_tersulit:
                topik_tersulit = {"nama": nama_t, "avg_bkt": round(avg_t, 4)}

    return {
        "total_siswa": total_siswa,
        "total_soal": total_soal,
        "avg_bkt_kelas": round(avg_bkt_kelas, 4),
        "topik_tersulit": topik_tersulit,
        "topik_chart_data": topik_chart_data,
        "is_scoped_empty": False
    }

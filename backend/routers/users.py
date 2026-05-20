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


@router.post("/admin-create-dosen", response_model=schemas.UserListResponse, status_code=status.HTTP_201_CREATED)
def admin_create_dosen(payload: schemas.AdminDosenCreate, requestor_id: int, db: Session = Depends(get_db)):
    """Super Admin membuat akun dosen untuk suatu instansi tertentu."""
    requestor = db.query(models.User).filter(models.User.user_id == requestor_id).first()
    if not requestor or requestor.role != models.RoleEnum.super_admin:
        raise HTTPException(status_code=403, detail="Hanya Super Admin yang dapat mendaftarkan dosen lintas instansi.")

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
        password_hash=payload.password,
        role=models.RoleEnum.dosen,
        nama_lengkap=payload.nama_lengkap,
        instansi_id=payload.instansi_id
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

    siswa_list = db.query(models.User).filter(
        models.User.instansi_id == requestor.instansi_id,
        models.User.role == models.RoleEnum.siswa
    ).all()
    return siswa_list


@router.get("/dosen-list", response_model=list[schemas.UserListResponse])
def get_all_dosen(requestor_id: int, db: Session = Depends(get_db)):
    """Dosen melihat daftar semua dosen di instansinya sendiri."""
    requestor = db.query(models.User).filter(models.User.user_id == requestor_id).first()
    if not requestor or requestor.role not in [models.RoleEnum.dosen, models.RoleEnum.super_admin]:
        raise HTTPException(status_code=403, detail="Akses ditolak.")

    dosen_list = db.query(models.User).filter(
        models.User.instansi_id == requestor.instansi_id,
        models.User.role == models.RoleEnum.dosen
    ).all()
    return dosen_list


@router.get("/siswa-progress")
def get_siswa_progress(requestor_id: int, db: Session = Depends(get_db)):
    """Dosen melihat daftar siswa beserta rata-rata BKT per topik di instansinya."""
    requestor = db.query(models.User).filter(models.User.user_id == requestor_id).first()
    if not requestor or requestor.role not in [models.RoleEnum.dosen, models.RoleEnum.super_admin]:
        raise HTTPException(status_code=403, detail="Akses ditolak.")

    siswa_list = db.query(models.User).filter(
        models.User.instansi_id == requestor.instansi_id,
        models.User.role == models.RoleEnum.siswa
    ).all()

    result = []
    for siswa in siswa_list:
        # Ambil semua riwayat BKT siswa ini
        bkt_records = db.query(models.BKTHistory).filter(
            models.BKTHistory.siswa_id == siswa.user_id
        ).all()

        # Hitung rata-rata learned_prob dari semua topik
        avg_bkt = 0.0
        if bkt_records:
            avg_bkt = sum(r.learned_prob for r in bkt_records) / len(bkt_records)

        # Ambil topik terakhir yang dikerjakan (berdasarkan updated_at)
        latest_bkt = max(bkt_records, key=lambda r: r.updated_at, default=None)
        topik_terakhir = None
        if latest_bkt:
            topik = db.query(models.TopikMateri).filter(
                models.TopikMateri.topik_id == latest_bkt.topik_id
            ).first()
            topik_terakhir = topik.nama_topik if topik else None

        # Hitung jumlah soal yang sudah dikerjakan
        jumlah_submit = db.query(models.Evaluasi).filter(
            models.Evaluasi.siswa_id == siswa.user_id
        ).count()

        result.append({
            "user_id": siswa.user_id,
            "nama_lengkap": siswa.nama_lengkap,
            "username": siswa.username,
            "nama_kelas": siswa.nama_kelas,
            "avg_bkt": round(avg_bkt, 4),
            "topik_terakhir": topik_terakhir,
            "jumlah_submit": jumlah_submit,
        })

    return result


@router.get("/dashboard-stats")
def get_dashboard_stats(requestor_id: int, db: Session = Depends(get_db)):
    """Statistik ringkasan untuk dashboard dosen: total siswa, soal, dan rata-rata BKT kelas."""
    requestor = db.query(models.User).filter(models.User.user_id == requestor_id).first()
    if not requestor or requestor.role not in [models.RoleEnum.dosen, models.RoleEnum.super_admin]:
        raise HTTPException(status_code=403, detail="Akses ditolak.")

    # Hitung total siswa di instansi
    total_siswa = db.query(models.User).filter(
        models.User.instansi_id == requestor.instansi_id,
        models.User.role == models.RoleEnum.siswa
    ).count()

    # Hitung total soal yang dibuat dosen di instansi ini
    dosen_ids = [u.user_id for u in db.query(models.User).filter(
        models.User.instansi_id == requestor.instansi_id,
        models.User.role == models.RoleEnum.dosen
    ).all()]
    total_soal = db.query(models.Soal).filter(
        models.Soal.dosen_id.in_(dosen_ids)
    ).count() if dosen_ids else 0

    # Hitung rata-rata BKT seluruh siswa di instansi
    siswa_ids = [u.user_id for u in db.query(models.User).filter(
        models.User.instansi_id == requestor.instansi_id,
        models.User.role == models.RoleEnum.siswa
    ).all()]
    all_bkt = db.query(models.BKTHistory).filter(
        models.BKTHistory.siswa_id.in_(siswa_ids)
    ).all() if siswa_ids else []

    avg_bkt_kelas = 0.0
    if all_bkt:
        avg_bkt_kelas = sum(r.learned_prob for r in all_bkt) / len(all_bkt)

    # Cari topik tersulit (rata-rata BKT terendah)
    topik_stats = {}
    for bkt in all_bkt:
        if bkt.topik_id not in topik_stats:
            topik_stats[bkt.topik_id] = []
        topik_stats[bkt.topik_id].append(bkt.learned_prob)

    topik_tersulit = None
    topik_chart_data = []
    
    if topik_stats:
        topik_id_tersulit = min(topik_stats, key=lambda t: sum(topik_stats[t]) / len(topik_stats[t]))
        
        # Ambil semua nama topik sekaligus
        topik_ids = list(topik_stats.keys())
        topik_objs = db.query(models.TopikMateri).filter(models.TopikMateri.topik_id.in_(topik_ids)).all()
        topik_dict = {t.topik_id: t.nama_topik for t in topik_objs}

        for tid, probs in topik_stats.items():
            avg_t = sum(probs) / len(probs)
            nama_t = topik_dict.get(tid, f"Topik {tid}")
            
            topik_chart_data.append({
                "nama": nama_t,
                "avg_bkt": round(avg_t, 4)
            })
            
            if tid == topik_id_tersulit:
                topik_tersulit = {
                    "nama": nama_t,
                    "avg_bkt": round(avg_t, 4)
                }

    return {
        "total_siswa": total_siswa,
        "total_soal": total_soal,
        "avg_bkt_kelas": round(avg_bkt_kelas, 4),
        "topik_tersulit": topik_tersulit,
        "topik_chart_data": topik_chart_data
    }

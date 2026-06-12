from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from services.bkt_service import predict_mastery_attempts, get_recommendation_score
from services.auth_service import get_current_user, require_role

router = APIRouter(
    prefix="/api/soal",
    tags=["Manajemen Soal"]
)

@router.post("/", response_model=schemas.SoalResponse)
def create_soal_with_testcase(
    payload: schemas.SoalWithTestCaseCreate,
    current_user: models.User = Depends(require_role("dosen", "super_admin")),
    db: Session = Depends(get_db)
):
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
        judul_soal=payload.judul_soal,
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

@router.post("/topik", response_model=schemas.TopikMateriResponse)
def create_topik(
    payload: schemas.TopikMateriCreate,
    current_user: models.User = Depends(require_role("dosen", "super_admin")),
    db: Session = Depends(get_db)
):
    """Menambahkan Topik Materi baru ke database."""
    # Cek duplikat nama topik
    existing = db.query(models.TopikMateri).filter(models.TopikMateri.nama_topik == payload.nama_topik).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Topik dengan nama '{payload.nama_topik}' sudah ada.")

    db_topik = models.TopikMateri(
        nama_topik=payload.nama_topik,
        deskripsi=payload.deskripsi
    )
    db.add(db_topik)
    db.commit()
    db.refresh(db_topik)
    return db_topik

@router.delete("/topik/{topik_id}")
def delete_topik(
    topik_id: int,
    current_user: models.User = Depends(require_role("dosen", "super_admin")),
    db: Session = Depends(get_db)
):
    """Menghapus Topik Materi. Gagal jika masih ada soal yang menggunakan topik ini."""
    topik = db.query(models.TopikMateri).filter(models.TopikMateri.topik_id == topik_id).first()
    if not topik:
        raise HTTPException(status_code=404, detail="Topik tidak ditemukan.")

    # Cek apakah ada soal yang masih menggunakan topik ini
    soal_count = db.query(models.Soal).filter(models.Soal.topik_id == topik_id).count()
    if soal_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Tidak bisa menghapus topik ini karena masih digunakan oleh {soal_count} soal. Hapus soal terkait terlebih dahulu."
        )

    # Hapus juga BKT history yang terkait topik ini
    db.query(models.BKTHistory).filter(models.BKTHistory.topik_id == topik_id).delete()

    db.delete(topik)
    db.commit()
    return {"message": f"Topik '{topik.nama_topik}' berhasil dihapus."}


@router.get("/")
def get_all_soal(
    current_user: models.User = Depends(require_role("dosen", "super_admin")),
    db: Session = Depends(get_db)
):
    soal_list = db.query(models.Soal).all()
    result = []
    for s in soal_list:
        testcases = db.query(models.TestCase).filter(models.TestCase.soal_id == s.soal_id).all()
        result.append({
            "soal_id": s.soal_id,
            "topik_id": s.topik_id,
            "judul_soal": s.judul_soal,
            "deskripsi_soal": s.deskripsi_soal,
            "tingkat_kesulitan": s.tingkat_kesulitan,
            "testcases": testcases
        })
    return result

@router.put("/{soal_id}", response_model=schemas.SoalResponse)
def update_soal(
    soal_id: int,
    payload: schemas.SoalWithTestCaseUpdate,
    current_user: models.User = Depends(require_role("dosen", "super_admin")),
    db: Session = Depends(get_db)
):
    soal = db.query(models.Soal).filter(models.Soal.soal_id == soal_id).first()
    if not soal:
        raise HTTPException(status_code=404, detail="Soal tidak ditemukan")
    
    # Update atribut soal
    soal.topik_id = payload.topik_id
    soal.judul_soal = payload.judul_soal
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
def delete_soal(
    soal_id: int,
    current_user: models.User = Depends(require_role("dosen", "super_admin")),
    db: Session = Depends(get_db)
):
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
def get_soal_siswa(
    user_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mengambil daftar soal untuk siswa beserta nama topik dan state BKT saat ini."""
    # Siswa hanya boleh akses data soal untuk dirinya sendiri
    if current_user.role.value == 'siswa' and current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="Akses ditolak.")
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

        # Cek apakah pernah diselesaikan dengan benar (binary_result = 1)
        solved = db.query(models.Evaluasi).filter(
            models.Evaluasi.siswa_id == user_id,
            models.Evaluasi.soal_id == s.soal_id,
            models.Evaluasi.binary_result == 1
        ).first() is not None

        # Cek status lock/unlock sesuai aturan adaptif:
        # Mudah: Selalu terbuka (is_locked = False)
        # Sedang: Terbuka jika learned_prob >= 0.4
        # Sulit: Terbuka jika learned_prob >= 0.8
        is_locked = False
        if s.tingkat_kesulitan == "Sedang" and learned_prob < 0.4:
            is_locked = True
        elif s.tingkat_kesulitan == "Sulit" and learned_prob < 0.8:
            is_locked = True

        result.append({
            "soal_id": s.soal_id,
            "topik_id": s.topik_id,
            "nama_topik": nama_topik,
            "judul_soal": s.judul_soal,
            "deskripsi_soal": s.deskripsi_soal,
            "tingkat_kesulitan": s.tingkat_kesulitan,
            "learned_prob": learned_prob,
            "is_solved": solved,
            "is_locked": is_locked
        })
        
    return result


@router.get("/siswa/{user_id}/soal/{soal_id}")
def get_soal_siswa_single(
    user_id: int,
    soal_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mengambil detail satu soal untuk siswa beserta state BKT topik terkait dan riwayat submit soal tersebut."""
    if current_user.role.value == 'siswa' and current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="Akses ditolak.")
    siswa = db.query(models.User).filter(models.User.user_id == user_id, models.User.role == 'siswa').first()
    if not siswa:
        raise HTTPException(status_code=404, detail="Siswa tidak ditemukan")
        
    soal = db.query(models.Soal).filter(models.Soal.soal_id == soal_id).first()
    if not soal:
        raise HTTPException(status_code=404, detail="Soal tidak ditemukan")
        
    topik = db.query(models.TopikMateri).filter(models.TopikMateri.topik_id == soal.topik_id).first()
    nama_topik = topik.nama_topik if topik else "Topik Tidak Diketahui"
    
    bkt_record = db.query(models.BKTHistory).filter(
        models.BKTHistory.siswa_id == user_id,
        models.BKTHistory.topik_id == soal.topik_id
    ).first()
    learned_prob = bkt_record.learned_prob if bkt_record else 0.1
    
    # Validasi status lock/unlock untuk adaptif kognitif (bypass URL check)
    is_locked = False
    if soal.tingkat_kesulitan == "Sedang" and learned_prob < 0.4:
        is_locked = True
    elif soal.tingkat_kesulitan == "Sulit" and learned_prob < 0.8:
        is_locked = True
        
    if is_locked:
        raise HTTPException(
            status_code=403, 
            detail="Soal ini masih terkunci. Silakan tingkatkan pemahaman Anda pada topik ini terlebih dahulu."
        )
    
    evaluasi_soal = db.query(models.Evaluasi).filter(
        models.Evaluasi.siswa_id == user_id,
        models.Evaluasi.soal_id == soal_id
    ).order_by(models.Evaluasi.timestamp.desc()).all()
    
    attempts = []
    for r in evaluasi_soal:
        attempts.append({
            "evaluasi_id": r.evaluasi_id,
            "status_compile": r.status_compile,
            "binary_result": r.binary_result,
            "timestamp": r.timestamp,
            "source_code": r.source_code
        })
        
    is_solved = any(r.binary_result == 1 for r in evaluasi_soal)
    
    return {
        "soal_id": soal.soal_id,
        "topik_id": soal.topik_id,
        "nama_topik": nama_topik,
        "judul_soal": soal.judul_soal,
        "deskripsi_soal": soal.deskripsi_soal,
        "tingkat_kesulitan": soal.tingkat_kesulitan,
        "learned_prob": learned_prob,
        "is_solved": is_solved,
        "attempts": attempts
    }

@router.get("/siswa/{user_id}/bkt-stats", response_model=list[schemas.BKTStatsResponse])
def get_bkt_stats(
    user_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mengambil state BKT terakhir untuk setiap topik yang pernah dikerjakan oleh siswa."""
    if current_user.role.value == 'siswa' and current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="Akses ditolak.")
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


@router.get("/siswa/{user_id}/rekomendasi")
def get_rekomendasi_topik(
    user_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mengambil rekomendasi TOP-3 topik yang paling mendesak untuk dikerjakan siswa
    berdasarkan nilai BKT saat ini, beserta prediksi submit benar untuk menguasai topik.
    """
    if current_user.role.value == 'siswa' and current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="Akses ditolak.")
    siswa = db.query(models.User).filter(models.User.user_id == user_id, models.User.role == 'siswa').first()
    if not siswa:
        raise HTTPException(status_code=404, detail="Siswa tidak ditemukan")

    # Ambil semua dosen di instansi yang sama
    dosen_instansi = db.query(models.User.user_id).filter(
        models.User.instansi_id == siswa.instansi_id,
        models.User.role == 'dosen'
    ).subquery()

    # Ambil semua topik yang ada soalnya dari dosen instansi ini
    soal_instansi = db.query(models.Soal.topik_id).filter(
        models.Soal.dosen_id.in_(dosen_instansi)
    ).distinct().all()
    topik_ids = [s.topik_id for s in soal_instansi]

    kandidat = []
    for t_id in topik_ids:
        topik = db.query(models.TopikMateri).filter(models.TopikMateri.topik_id == t_id).first()
        if not topik:
            continue

        # Ambil BKT state siswa untuk topik ini
        bkt_record = db.query(models.BKTHistory).filter(
            models.BKTHistory.siswa_id == user_id,
            models.BKTHistory.topik_id == t_id
        ).first()
        learned_prob = bkt_record.learned_prob if bkt_record else 0.1

        # Lewati topik yang sudah dikuasai (P(L) >= 0.95)
        if learned_prob >= 0.95:
            continue

        # Ambil semua soal dari topik ini untuk analisis
        soal_list = db.query(models.Soal).filter(
            models.Soal.topik_id == t_id,
            models.Soal.dosen_id.in_(dosen_instansi)
        ).all()

        # Cari soal yang belum diselesaikan dan tidak terkunci (Adaptive Routing)
        soal_tersedia = None
        for s in soal_list:
            solved = db.query(models.Evaluasi).filter(
                models.Evaluasi.siswa_id == user_id,
                models.Evaluasi.soal_id == s.soal_id,
                models.Evaluasi.binary_result == 1
            ).first() is not None
            
            if not solved:
                # Cek status lock
                s_locked = False
                if s.tingkat_kesulitan == "Sedang" and learned_prob < 0.4:
                    s_locked = True
                elif s.tingkat_kesulitan == "Sulit" and learned_prob < 0.8:
                    s_locked = True
                
                if not s_locked:
                    soal_tersedia = s
                    break

        # Jika semua soal sudah diselesaikan atau yang tersisa terkunci, fallback ke soal pertama
        if not soal_tersedia and soal_list:
            soal_tersedia = soal_list[0]

        # Hitung tingkat kesulitan dominan
        tingkat_counts = {"Mudah": 0, "Sedang": 0, "Sulit": 0}
        for s in soal_list:
            if s.tingkat_kesulitan in tingkat_counts:
                tingkat_counts[s.tingkat_kesulitan] += 1
        tingkat_dominan = max(tingkat_counts, key=tingkat_counts.get)

        # Prediksi berapa submit benar diperlukan untuk menguasai topik dengan transition_rate dinamis
        estimasi_submit = predict_mastery_attempts(learned_prob, tingkat_dominan, num_soal=len(soal_list))

        # Hitung skor rekomendasi
        skor = get_recommendation_score(learned_prob)

        kandidat.append({
            "topik_id": t_id,
            "nama_topik": topik.nama_topik,
            "learned_prob": round(learned_prob, 4),
            "skor_rekomendasi": skor,
            "estimasi_submit": estimasi_submit,
            "tingkat_kesulitan_dominan": tingkat_dominan,
            "soal_id": soal_tersedia.soal_id if soal_tersedia else None,
            "judul_soal": soal_tersedia.judul_soal if soal_tersedia else None,
        })

    # Urutkan berdasarkan skor rekomendasi tertinggi, ambil top 3
    kandidat.sort(key=lambda x: x["skor_rekomendasi"], reverse=True)
    return kandidat[:3]

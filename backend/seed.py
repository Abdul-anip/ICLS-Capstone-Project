from database import SessionLocal, engine
import models

def seed_data():
    # Buat semua tabel (termasuk tb_instansi yang baru)
    models.Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    # Cek apakah data sudah ada
    if db.query(models.Instansi).first():
        print("Data sudah ada, melewati proses seeding.")
        db.close()
        return

    print("Memasukkan data dummy multi-instansi ke dalam database...")

    # ── 1. Buat Instansi ──────────────────────────────────────────────
    instansi_a = models.Instansi(
        nama_instansi="SMAN 1 Bandung",
        kode_instansi="SMAN1-BDG",
        alamat="Jl. Ir. H. Juanda No.93, Bandung"
    )
    instansi_b = models.Instansi(
        nama_instansi="SMKN 2 Jakarta",
        kode_instansi="SMKN2-JKT",
        alamat="Jl. Pintu Air IV No.1, Jakarta"
    )
    db.add_all([instansi_a, instansi_b])
    db.commit()

    # ── 2. Buat Super Admin (tidak terikat instansi) ──────────────────
    super_admin = models.User(
        username="superadmin",
        password_hash="admin123",
        role=models.RoleEnum.super_admin,
        nama_lengkap="Super Administrator",
        instansi_id=None
    )
    db.add(super_admin)
    db.commit()

    # ── 3. Buat Dosen & Siswa untuk Instansi A (SMAN 1 Bandung) ───────
    dosen_a = models.User(
        username="dosen_budi",
        password_hash="123",
        role=models.RoleEnum.dosen,
        nama_lengkap="Budi Instruktur",
        instansi_id=instansi_a.instansi_id
    )
    siswa_a1 = models.User(
        username="siswa_hanif",
        password_hash="123",
        role=models.RoleEnum.siswa,
        nama_lengkap="Ahmad Hanif",
        nama_kelas="XII RPL 1",
        instansi_id=instansi_a.instansi_id
    )
    siswa_a2 = models.User(
        username="siswa_rina",
        password_hash="123",
        role=models.RoleEnum.siswa,
        nama_lengkap="Rina Kusuma",
        nama_kelas="XII RPL 1",
        instansi_id=instansi_a.instansi_id
    )
    db.add_all([dosen_a, siswa_a1, siswa_a2])
    db.commit()

    # ── 4. Buat Dosen & Siswa untuk Instansi B (SMKN 2 Jakarta) ───────
    dosen_b = models.User(
        username="dosen_citra",
        password_hash="123",
        role=models.RoleEnum.dosen,
        nama_lengkap="Citra Dewi",
        instansi_id=instansi_b.instansi_id
    )
    siswa_b1 = models.User(
        username="siswa_bagus",
        password_hash="123",
        role=models.RoleEnum.siswa,
        nama_lengkap="Bagus Pratama",
        nama_kelas="XI TKJ 2",
        instansi_id=instansi_b.instansi_id
    )
    db.add_all([dosen_b, siswa_b1])
    db.commit()

    # ── 5. Buat Topik & Soal (milik instansi A, oleh dosen_a) ─────────
    topik = models.TopikMateri(
        nama_topik="Fungsi & Bilangan Genap",
        deskripsi="Mempelajari cara membuat fungsi Python untuk mengecek bilangan genap."
    )
    db.add(topik)
    db.commit()

    soal = models.Soal(
        topik_id=topik.topik_id,
        dosen_id=dosen_a.user_id,
        judul_soal="Fungsi Pengecek Bilangan Genap",
        deskripsi_soal="Buat fungsi is_even(num) yang mengembalikan True jika genap, False jika ganjil.",
        tingkat_kesulitan="Mudah"
    )
    db.add(soal)
    db.commit()

    testcase = models.TestCase(
        soal_id=soal.soal_id,
        input_data="4\n7",
        expected_output="True\nFalse",
        is_hidden=False
    )
    db.add(testcase)
    db.commit()

    print("\n✅ Seeding selesai! Akun yang tersedia:")
    print("  [Super Admin] username: superadmin      | password: admin123")
    print("  [Dosen A]     username: dosen_budi      | password: 123  | Instansi: SMAN 1 Bandung")
    print("  [Siswa A1]    username: siswa_hanif     | password: 123  | Instansi: SMAN 1 Bandung")
    print("  [Siswa A2]    username: siswa_rina      | password: 123  | Instansi: SMAN 1 Bandung")
    print("  [Dosen B]     username: dosen_citra     | password: 123  | Instansi: SMKN 2 Jakarta")
    print("  [Siswa B1]    username: siswa_bagus     | password: 123  | Instansi: SMKN 2 Jakarta")
    print("\n  Kode Instansi untuk registrasi:")
    print("  SMAN 1 Bandung  → SMAN1-BDG")
    print("  SMKN 2 Jakarta  → SMKN2-JKT")
    db.close()

if __name__ == "__main__":
    seed_data()

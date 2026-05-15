from database import SessionLocal, engine
import models

def seed_data():
    db = SessionLocal()
    
    # Cek apakah data sudah ada
    if db.query(models.User).first():
        print("Data sudah ada, melewati proses seeding.")
        db.close()
        return

    print("Memasukkan data dummy ke dalam database...")

    # 1. Buat User (Dosen & Siswa)
    dosen = models.User(username="dosen_budi", password_hash="123", role="dosen", nama_lengkap="Budi Instruktur", instansi_kelas="Kelas A")
    siswa = models.User(username="siswa_hanif", password_hash="123", role="siswa", nama_lengkap="Ahmad Hanif", instansi_kelas="Kelas A")
    db.add_all([dosen, siswa])
    db.commit()

    # 2. Buat Topik Materi
    topik = models.TopikMateri(nama_topik="Fungsi & Bilangan Genap", deskripsi="Mempelajari cara membuat fungsi Python untuk mengecek bilangan genap.")
    db.add(topik)
    db.commit()

    # 3. Buat Soal
    soal = models.Soal(
        topik_id=topik.topik_id,
        dosen_id=dosen.user_id,
        deskripsi_soal="Buat fungsi is_even(num) yang mengembalikan True jika genap, False jika ganjil.",
        tingkat_kesulitan="Mudah"
    )
    db.add(soal)
    db.commit()

    # 4. Buat Test Case
    testcase = models.TestCase(
        soal_id=soal.soal_id,
        input_data="4\n7",
        expected_output="True\nFalse",
        is_hidden=False
    )
    db.add(testcase)
    db.commit()

    print("Data dummy berhasil dimasukkan! Silakan tes fitur aplikasinya.")
    db.close()

if __name__ == "__main__":
    seed_data()

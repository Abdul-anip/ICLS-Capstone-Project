from database import SessionLocal
import models

def add_soal():
    db = SessionLocal()
    try:
        # 1. Cari dosen_budi untuk mendapatkan user_id nya
        dosen = db.query(models.User).filter(models.User.username == "dosen_budi").first()
        if not dosen:
            print("Error: User 'dosen_budi' tidak ditemukan di database.")
            return

        # 2. Cek/Buat Topik Baru
        topik = db.query(models.TopikMateri).filter(models.TopikMateri.nama_topik == "Bilangan Prima").first()
        if not topik:
            topik = models.TopikMateri(
                nama_topik="Bilangan Prima",
                deskripsi="Mempelajari algoritma pengecekan apakah sebuah bilangan adalah bilangan prima."
            )
            db.add(topik)
            db.commit()
            db.refresh(topik)
            print(f"Topik baru '{topik.nama_topik}' berhasil dibuat.")
        else:
            print(f"Topik '{topik.nama_topik}' sudah ada.")

        # 3. Cek/Buat Soal Baru
        soal = db.query(models.Soal).filter(models.Soal.judul_soal == "Pengecek Bilangan Prima").first()
        if not soal:
            soal = models.Soal(
                topik_id=topik.topik_id,
                dosen_id=dosen.user_id,
                judul_soal="Pengecek Bilangan Prima",
                deskripsi_soal=(
                    "Buatlah program yang membaca beberapa baris input dari stdin. "
                    "Untuk setiap baris input yang berisi satu bilangan bulat positif, "
                    "program harus mencetak 'Prima' jika bilangan tersebut adalah bilangan prima, "
                    "atau 'Bukan Prima' jika bilangan tersebut bukan bilangan prima.\n\n"
                    "Input:\n"
                    "Dua baris input, masing-masing berisi satu angka integer.\n\n"
                    "Contoh Input:\n"
                    "5\n"
                    "9\n\n"
                    "Contoh Output:\n"
                    "Prima\n"
                    "Bukan Prima"
                ),
                tingkat_kesulitan=models.KesulitanEnum.Sedang
            )
            db.add(soal)
            db.commit()
            db.refresh(soal)
            print(f"Soal baru '{soal.judul_soal}' berhasil dibuat.")

            # 4. Buat Test Case untuk Soal Baru
            testcase = models.TestCase(
                soal_id=soal.soal_id,
                input_data="5\n9",
                expected_output="Prima\nBukan Prima",
                is_hidden=False
            )
            db.add(testcase)
            db.commit()
            print("Test case untuk soal 'Pengecek Bilangan Prima' berhasil dibuat.")
        else:
            print(f"Soal '{soal.judul_soal}' sudah ada.")

        print("\n✅ Pembuatan soal testing selesai!")

    except Exception as e:
        print(f"Error saat menambahkan data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_soal()

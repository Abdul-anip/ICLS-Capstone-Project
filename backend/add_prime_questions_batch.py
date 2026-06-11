from database import SessionLocal
import models

def add_soal_prime_batch():
    db = SessionLocal()
    try:
        # 1. Cari dosen_budi untuk mendapatkan user_id nya
        dosen = db.query(models.User).filter(models.User.username == "dosen_budi").first()
        if not dosen:
            print("Error: User 'dosen_budi' tidak ditemukan di database.")
            return

        # 2. Cek/Buat Topik Baru "Bilangan Prima"
        topik = db.query(models.TopikMateri).filter(models.TopikMateri.nama_topik == "Bilangan Prima").first()
        if not topik:
            topik = models.TopikMateri(
                nama_topik="Bilangan Prima",
                deskripsi="Mempelajari algoritma pengecekan, penyaringan, dan pengolahan bilangan prima."
            )
            db.add(topik)
            db.commit()
            db.refresh(topik)
            print(f"Topik baru '{topik.nama_topik}' berhasil dibuat.")
        else:
            print(f"Topik '{topik.nama_topik}' sudah ada.")

        # Data 5 Soal Bilangan Prima
        soal_data = [
            {
                "judul": "Cek Bilangan Prima",
                "kesulitan": models.KesulitanEnum.Mudah,
                "deskripsi": (
                    "Buatlah program yang menerima satu bilangan bulat positif N dari input standar (stdin).\n"
                    "Program harus memeriksa apakah bilangan tersebut merupakan bilangan prima.\n\n"
                    "Jika bilangan tersebut prima, cetak 'YA'. Jika bukan, cetak 'TIDAK'.\n\n"
                    "Format Input:\n"
                    "Satu baris berisi bilangan bulat N (N > 1).\n\n"
                    "Format Output:\n"
                    "Satu baris berisi string 'YA' atau 'TIDAK'.\n\n"
                    "Contoh Input:\n"
                    "5\n\n"
                    "Contoh Output:\n"
                    "YA"
                ),
                "testcase_input": "5",
                "testcase_output": "YA"
            },
            {
                "judul": "Bilangan Prima Berikutnya",
                "kesulitan": models.KesulitanEnum.Mudah,
                "deskripsi": (
                    "Buatlah program yang menerima sebuah bilangan bulat positif N dari input standar (stdin).\n"
                    "Temukan dan cetak bilangan prima terkecil yang nilainya lebih besar dari N.\n\n"
                    "Format Input:\n"
                    "Satu baris berisi bilangan bulat N.\n\n"
                    "Format Output:\n"
                    "Satu baris berisi bilangan prima berikutnya.\n\n"
                    "Contoh Input:\n"
                    "14\n\n"
                    "Contoh Output:\n"
                    "17"
                ),
                "testcase_input": "14",
                "testcase_output": "17"
            },
            {
                "judul": "Jumlah Prima Rentang A ke B",
                "kesulitan": models.KesulitanEnum.Sedang,
                "deskripsi": (
                    "Buatlah program yang menerima dua bilangan bulat A dan B (A <= B) dari input standar (stdin).\n"
                    "Hitunglah jumlah total dari semua bilangan prima yang berada di dalam rentang [A, B] (inklusif).\n\n"
                    "Format Input:\n"
                    "Satu baris berisi dua bilangan bulat A dan B dipisahkan oleh spasi.\n\n"
                    "Format Output:\n"
                    "Satu bilangan bulat hasil penjumlahan seluruh bilangan prima dalam rentang tersebut.\n\n"
                    "Contoh Input:\n"
                    "10 20\n\n"
                    "Contoh Output:\n"
                    "60"
                ),
                "testcase_input": "10 20",
                "testcase_output": "60"
            },
            {
                "judul": "Cetak N Prima Pertama",
                "kesulitan": models.KesulitanEnum.Sedang,
                "deskripsi": (
                    "Buatlah program yang menerima sebuah bilangan bulat positif N dari input standar (stdin).\n"
                    "Program harus mencetak N buah bilangan prima pertama, dipisahkan oleh satu spasi.\n\n"
                    "Format Input:\n"
                    "Satu baris berisi bilangan bulat N (N >= 1).\n\n"
                    "Format Output:\n"
                    "Deret N bilangan prima pertama dipisahkan oleh spasi.\n\n"
                    "Contoh Input:\n"
                    "5\n\n"
                    "Contoh Output:\n"
                    "2 3 5 7 11"
                ),
                "testcase_input": "5",
                "testcase_output": "2 3 5 7 11"
            },
            {
                "judul": "Faktorisasi Prima Bulat",
                "kesulitan": models.KesulitanEnum.Sulit,
                "deskripsi": (
                    "Buatlah program yang menerima sebuah bilangan bulat positif N (N > 1) dari input standar (stdin).\n"
                    "Program harus mencetak faktor-faktor prima pembentuk N beserta pangkatnya secara terurut dari faktor terkecil ke terbesar.\n"
                    "Tampilkan dalam format 'faktor^pangkat' dan pisahkan setiap faktor prima dengan tanda perkalian '*'.\n\n"
                    "Format Input:\n"
                    "Satu baris berisi bilangan bulat N.\n\n"
                    "Format Output:\n"
                    "String representasi faktorisasi prima N.\n\n"
                    "Contoh Input:\n"
                    "60\n\n"
                    "Contoh Output:\n"
                    "2^2 * 3^1 * 5^1"
                ),
                "testcase_input": "60",
                "testcase_output": "2^2 * 3^1 * 5^1"
            }
        ]

        # 3. Iterasi dan simpan soal-soal
        for s in soal_data:
            existing_soal = db.query(models.Soal).filter(
                models.Soal.judul_soal == s["judul"], 
                models.Soal.topik_id == topik.topik_id
            ).first()

            if not existing_soal:
                soal = models.Soal(
                    topik_id=topik.topik_id,
                    dosen_id=dosen.user_id,
                    judul_soal=s["judul"],
                    deskripsi_soal=s["deskripsi"],
                    tingkat_kesulitan=s["kesulitan"]
                )
                db.add(soal)
                db.commit()
                db.refresh(soal)
                print(f"Soal '{soal.judul_soal}' ({soal.tingkat_kesulitan}) berhasil dibuat.")

                # Buat Testcase
                testcase = models.TestCase(
                    soal_id=soal.soal_id,
                    input_data=s["testcase_input"],
                    expected_output=s["testcase_output"],
                    is_hidden=False
                )
                db.add(testcase)
                db.commit()
                print(f"  -> Test case untuk '{soal.judul_soal}' ditambahkan.")
            else:
                print(f"Soal '{s['judul']}' sudah ada di database.")

        print("\n✅ Proses penambahan 5 soal bilangan prima selesai!")

    except Exception as e:
        print(f"Error saat menambahkan data batch: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_soal_prime_batch()

import models
from database import engine, SessionLocal
from seed import seed_data

def reset_db():
    print("⚠️  Mulai mereset database MySQL...")
    
    # Drop semua tabel yang ada
    print("1. Menghapus semua tabel lama (jika ada)...")
    models.Base.metadata.drop_all(bind=engine)
    
    # Buat ulang semua tabel dengan skema baru
    print("2. Membuat ulang tabel dengan skema baru...")
    models.Base.metadata.create_all(bind=engine)
    
    # Jalankan proses seeding
    print("3. Memasukkan data seeder (Instansi, Kelas, Dosen, Siswa, Soal, Test Case)...")
    db = SessionLocal()
    try:
        # Panggil langsung logika seeding dari seed.py
        # Karena di seed.py ada pengecekan `if db.query(models.Instansi).first():`, 
        # kita pastikan pengecekan tersebut dilewati karena database baru saja di-drop.
        from seed import seed_data
        seed_data()
    except Exception as e:
        print(f"❌ Terjadi kesalahan saat seeding: {e}")
    finally:
        db.close()
        
    print("\n✅ Database berhasil di-reset dan di-seed!")

if __name__ == "__main__":
    reset_db()

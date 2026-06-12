"""
Script migrasi one-time: Mengkonversi semua password plaintext yang ada di database
menjadi bcrypt hash yang aman.

CARA MENJALANKAN (hanya sekali sebelum go-live):
    cd backend
    python migrate_passwords.py

Script ini aman dijalankan berulang kali (idempotent):
- Jika password sudah berbentuk bcrypt hash ($2b$...), maka akan dilewati.
- Hanya password plaintext yang akan dikonversi.
"""

import sys
import os

# Tambahkan path backend agar modul bisa diimport
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
import models
from services.auth_service import hash_password


def is_bcrypt_hash(value: str) -> bool:
    """Cek apakah string sudah merupakan bcrypt hash."""
    return value.startswith("$2b$") or value.startswith("$2a$")


def migrate():
    db = SessionLocal()
    try:
        users = db.query(models.User).all()
        total = len(users)
        converted = 0
        skipped = 0

        print(f"\n{'='*50}")
        print(f"  ICLS Password Migration - Plaintext -> Bcrypt")
        print(f"{'='*50}")
        print(f"Total akun ditemukan: {total}\n")

        for user in users:
            if is_bcrypt_hash(user.password_hash):
                print(f"  [SKIP]    {user.username} (sudah bcrypt)")
                skipped += 1
            else:
                plain_password = user.password_hash  # password lama = plaintext
                user.password_hash = hash_password(plain_password)
                converted += 1
                print(f"  [CONVERT] {user.username} (role: {user.role.value})")

        db.commit()

        print(f"\n{'='*50}")
        print(f"  Selesai!")
        print(f"  Dikonversi : {converted} akun")
        print(f"  Dilewati   : {skipped} akun (sudah bcrypt)")
        print(f"{'='*50}\n")

    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] Migrasi gagal: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    migrate()

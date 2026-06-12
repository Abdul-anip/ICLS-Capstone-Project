import os
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import bcrypt
from sqlalchemy.orm import Session

from database import get_db
import models

# ─── Konfigurasi JWT ─────────────────────────────────────────────────────────
# PENTING: Ganti SECRET_KEY dengan nilai acak yang kuat di environment variable production.
# Contoh generate key: python -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY = os.environ.get("ICLS_SECRET_KEY", "icls-dev-secret-key-ganti-di-production-dengan-nilai-acak")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24  # Token berlaku 24 jam

# ─── OAuth2 scheme (membaca token dari header Authorization: Bearer <token>) ──
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


# ─── Fungsi Password Hashing ──────────────────────────────────────────────────

def hash_password(plain_password: str) -> str:
    """Mengembalikan bcrypt hash dari password plaintext."""
    # bcrypt requires bytes
    password_bytes = plain_password.encode('utf-8')
    # Generate salt and hash
    hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
    # Return as string
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Memverifikasi password plaintext terhadap bcrypt hash."""
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False


# ─── Fungsi JWT ───────────────────────────────────────────────────────────────

def create_access_token(data: dict) -> str:
    """
    Membuat JWT access token dengan payload yang diberikan.
    Otomatis menambahkan field 'exp' (expiry) selama ACCESS_TOKEN_EXPIRE_HOURS jam.
    """
    to_encode = data.copy()
    # PENTING: python-jose mewajibkan claim 'sub' (subject) berupa string
    if "sub" in to_encode:
        to_encode["sub"] = str(to_encode["sub"])
    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    """
    Mendecode dan memverifikasi JWT token.
    Raise HTTPException 401 jika token invalid atau sudah expired.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token tidak valid atau sudah kadaluarsa. Silakan login kembali.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        return payload
    except JWTError:
        raise credentials_exception


# ─── FastAPI Dependencies ─────────────────────────────────────────────────────

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> models.User:
    """
    Dependency FastAPI: mendecode JWT token dari header Authorization,
    lalu mengambil dan mengembalikan objek User dari database.
    Digunakan sebagai: current_user: User = Depends(get_current_user)
    """
    payload = decode_access_token(token)
    user_id_raw = payload.get("sub")
    try:
        user_id = int(user_id_raw)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token tidak valid atau format sub salah.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Akun tidak ditemukan. Silakan login kembali.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_role(*roles: str):
    """
    Factory dependency untuk memvalidasi role pengguna yang sedang login.
    Contoh penggunaan: current_user: User = Depends(require_role("dosen", "super_admin"))

    Raise 403 Forbidden jika role tidak sesuai.
    """
    async def role_checker(current_user: models.User = Depends(get_current_user)) -> models.User:
        if current_user.role.value not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Akses ditolak. Halaman ini hanya untuk: {', '.join(roles)}."
            )
        return current_user
    return role_checker

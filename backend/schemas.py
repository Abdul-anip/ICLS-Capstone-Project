from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ─────────────────────────────────────────
# Skema Instansi
# ─────────────────────────────────────────

class InstansiCreate(BaseModel):
    nama_instansi: str
    kode_instansi: str
    alamat: Optional[str] = None

class InstansiResponse(BaseModel):
    instansi_id: int
    nama_instansi: str
    kode_instansi: str
    alamat: Optional[str] = None

    class Config:
        orm_mode = True


# ─────────────────────────────────────────
# Skema Topik Materi
# ─────────────────────────────────────────

class TopikMateriCreate(BaseModel):
    nama_topik: str
    deskripsi: Optional[str] = None

class TopikMateriResponse(BaseModel):
    topik_id: int
    nama_topik: str
    deskripsi: Optional[str] = None

    class Config:
        orm_mode = True


# ─────────────────────────────────────────
# Skema Autentikasi
# ─────────────────────────────────────────

class UserLogin(BaseModel):
    username: str
    password: str

class UserRegister(BaseModel):
    username: str
    password: str
    nama_lengkap: str
    kode_instansi: str       # Siswa mendaftar menggunakan kode instansi
    kelas_id: Optional[int] = None

class UserLoginResponse(BaseModel):
    user_id: int
    username: str
    nama_lengkap: str
    role: str
    kelas_id: Optional[int] = None
    nama_kelas: Optional[str] = None
    instansi_id: Optional[int] = None
    nama_instansi: Optional[str] = None

    class Config:
        orm_mode = True


class TokenResponse(BaseModel):
    """Response login yang menyertakan JWT access token beserta data user."""
    access_token: str
    token_type: str = "bearer"
    user_id: int
    username: str
    nama_lengkap: str
    role: str
    kelas_id: Optional[int] = None
    nama_kelas: Optional[str] = None
    instansi_id: Optional[int] = None
    nama_instansi: Optional[str] = None


# ─────────────────────────────────────────
# Skema Manajemen User
# ─────────────────────────────────────────

class DosenCreate(BaseModel):
    username: str
    password: str
    nama_lengkap: str
    # instansi_id akan otomatis diisi dari dosen yang sedang login

class AdminDosenCreate(BaseModel):
    username: str
    password: str
    nama_lengkap: str
    instansi_id: int

class UserUpdate(BaseModel):
    nama_lengkap: Optional[str] = None
    kelas_id: Optional[int] = None

class PasswordChange(BaseModel):
    password_lama: str
    password_baru: str

class UserListResponse(BaseModel):
    user_id: int
    username: str
    nama_lengkap: str
    role: str
    kelas_id: Optional[int] = None
    nama_kelas: Optional[str] = None
    instansi_id: Optional[int] = None

    class Config:
        orm_mode = True


# ─────────────────────────────────────────
# Skema Soal
# ─────────────────────────────────────────

class SoalBase(BaseModel):
    judul_soal: Optional[str] = None
    deskripsi_soal: str
    tingkat_kesulitan: str

class SoalCreate(SoalBase):
    topik_id: int
    dosen_id: int

class SoalResponse(SoalBase):
    soal_id: int
    topik_id: int
    dosen_id: int

    class Config:
        orm_mode = True

class TestCaseCreate(BaseModel):
    input_data: str
    expected_output: str

class SoalWithTestCaseCreate(BaseModel):
    topik_id: int
    dosen_id: int
    judul_soal: Optional[str] = None
    deskripsi_soal: str
    tingkat_kesulitan: str
    testcases: List[TestCaseCreate]

class SoalWithTestCaseUpdate(BaseModel):
    topik_id: int
    judul_soal: Optional[str] = None
    deskripsi_soal: str
    tingkat_kesulitan: str
    testcases: List[TestCaseCreate]



# ─────────────────────────────────────────
# Skema Evaluasi & BKT
# ─────────────────────────────────────────

class CodeSubmit(BaseModel):
    siswa_id: int
    soal_id: int
    source_code: str
    language_id: int  # ID bahasa untuk Judge0 (contoh: 71 untuk Python)

class CodeEvaluationResponse(BaseModel):
    status_compile: str
    is_correct: bool
    output: str
    new_knowledge_state: float
    is_duplicate: bool = False
    passed_testcases: Optional[int] = None
    total_testcases: Optional[int] = None

class BKTStatsResponse(BaseModel):
    topik_id: int
    nama_topik: str
    learned_prob: float

class EvaluasiHistoryResponse(BaseModel):
    evaluasi_id: int
    soal_id: int
    deskripsi_soal: str
    status_compile: str
    binary_result: int
    timestamp: datetime


# ─────────────────────────────────────────
# Skema Kelas
# ─────────────────────────────────────────

class KelasCreate(BaseModel):
    nama_kelas: str
    instansi_id: int

class KelasResponse(BaseModel):
    kelas_id: int
    nama_kelas: str
    instansi_id: int

    class Config:
        orm_mode = True

class DosenKelasUpdate(BaseModel):
    dosen_id: int
    kelas_ids: List[int]

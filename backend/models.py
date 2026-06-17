from sqlalchemy import Column, Integer, String, Float, Text, Boolean, Enum, ForeignKey, DateTime, Table
from sqlalchemy.orm import relationship
from database import Base
import datetime
import enum


class RoleEnum(str, enum.Enum):
    siswa = "siswa"
    dosen = "dosen"
    super_admin = "super_admin"


class KesulitanEnum(str, enum.Enum):
    Mudah = "Mudah"
    Sedang = "Sedang"
    Sulit = "Sulit"


class Instansi(Base):
    __tablename__ = "tb_instansi"

    instansi_id = Column(Integer, primary_key=True, index=True)
    nama_instansi = Column(String(100), nullable=False)
    kode_instansi = Column(String(20), unique=True, nullable=False, index=True)
    alamat = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relasi
    users = relationship("User", back_populates="instansi")
    kelas = relationship("Kelas", back_populates="instansi")


dosen_kelas_association = Table(
    "tb_dosen_kelas",
    Base.metadata,
    Column("dosen_id", Integer, ForeignKey("tb_user.user_id", ondelete="CASCADE"), primary_key=True),
    Column("kelas_id", Integer, ForeignKey("tb_kelas.kelas_id", ondelete="CASCADE"), primary_key=True)
)

soal_kelas_association = Table(
    "tb_soal_kelas",
    Base.metadata,
    Column("soal_id", Integer, ForeignKey("tb_soal.soal_id", ondelete="CASCADE"), primary_key=True),
    Column("kelas_id", Integer, ForeignKey("tb_kelas.kelas_id", ondelete="CASCADE"), primary_key=True)
)


class Kelas(Base):
    __tablename__ = "tb_kelas"

    kelas_id = Column(Integer, primary_key=True, index=True)
    nama_kelas = Column(String(50), nullable=False)
    instansi_id = Column(Integer, ForeignKey("tb_instansi.instansi_id", ondelete="CASCADE"))

    # Relasi
    instansi = relationship("Instansi", back_populates="kelas")
    siswa = relationship("User", back_populates="kelas")
    dosen_pengampu = relationship("User", secondary=dosen_kelas_association, back_populates="kelas_diampu")
    soal_list = relationship("Soal", secondary=soal_kelas_association, back_populates="kelas_list")


class User(Base):
    __tablename__ = "tb_user"

    user_id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    password_hash = Column(String(255))
    role = Column(Enum(RoleEnum))
    nama_lengkap = Column(String(100))
    kelas_id = Column(Integer, ForeignKey("tb_kelas.kelas_id", ondelete="SET NULL"), nullable=True)
    instansi_id = Column(Integer, ForeignKey("tb_instansi.instansi_id"), nullable=True)  # NULL untuk super_admin

    # Relasi
    instansi = relationship("Instansi", back_populates="users")
    kelas = relationship("Kelas", back_populates="siswa")
    kelas_diampu = relationship("Kelas", secondary=dosen_kelas_association, back_populates="dosen_pengampu")
    soal_dibuat = relationship("Soal", back_populates="pembuat")
    evaluasi = relationship("Evaluasi", back_populates="siswa")
    bkt_history = relationship("BKTHistory", back_populates="siswa")

    @property
    def nama_kelas(self):
        return self.kelas.nama_kelas if self.kelas else None


class TopikMateri(Base):
    __tablename__ = "tb_topik_materi"

    topik_id = Column(Integer, primary_key=True, index=True)
    nama_topik = Column(String(100))
    deskripsi = Column(Text)

    # Relasi
    soal = relationship("Soal", back_populates="topik")
    bkt_history = relationship("BKTHistory", back_populates="topik")


class Soal(Base):
    __tablename__ = "tb_soal"

    soal_id = Column(Integer, primary_key=True, index=True)
    topik_id = Column(Integer, ForeignKey("tb_topik_materi.topik_id"))
    dosen_id = Column(Integer, ForeignKey("tb_user.user_id"))
    judul_soal = Column(String(200), nullable=True) # Tambah kolom judul soal
    deskripsi_soal = Column(Text)
    tingkat_kesulitan = Column(Enum(KesulitanEnum))

    # Relasi
    topik = relationship("TopikMateri", back_populates="soal")
    pembuat = relationship("User", back_populates="soal_dibuat")
    testcases = relationship("TestCase", back_populates="soal", cascade="all, delete-orphan")
    evaluasi = relationship("Evaluasi", back_populates="soal")
    kelas_list = relationship("Kelas", secondary=soal_kelas_association, back_populates="soal_list")


class TestCase(Base):
    __tablename__ = "tb_testcase"

    testcase_id = Column(Integer, primary_key=True, index=True)
    soal_id = Column(Integer, ForeignKey("tb_soal.soal_id"))
    input_data = Column(Text)
    expected_output = Column(Text)
    is_hidden = Column(Boolean, default=False)

    # Relasi
    soal = relationship("Soal", back_populates="testcases")


class Evaluasi(Base):
    __tablename__ = "tb_evaluasi"

    evaluasi_id = Column(Integer, primary_key=True, index=True)
    siswa_id = Column(Integer, ForeignKey("tb_user.user_id"))
    soal_id = Column(Integer, ForeignKey("tb_soal.soal_id"))
    source_code = Column(Text)
    status_compile = Column(String(50))
    binary_result = Column(Integer)  # 1 untuk benar, 0 untuk salah
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    # Relasi
    siswa = relationship("User", back_populates="evaluasi")
    soal = relationship("Soal", back_populates="evaluasi")


class BKTHistory(Base):
    __tablename__ = "tb_bkt_history"

    state_id = Column(Integer, primary_key=True, index=True)
    siswa_id = Column(Integer, ForeignKey("tb_user.user_id"))
    topik_id = Column(Integer, ForeignKey("tb_topik_materi.topik_id"))
    prior_prob = Column(Float, default=0.1)
    guess_rate = Column(Float, default=0.2)
    slip_rate = Column(Float, default=0.1)
    learned_prob = Column(Float, default=0.1)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relasi
    siswa = relationship("User", back_populates="bkt_history")
    topik = relationship("TopikMateri", back_populates="bkt_history")

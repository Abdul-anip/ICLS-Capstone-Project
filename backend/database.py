from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Ganti 'root' dan '' dengan username dan password MySQL Anda jika berbeda.
# Pastikan Anda telah membuat database dengan nama 'icls_db' di MySQL.
SQLALCHEMY_DATABASE_URL = "mysql+pymysql://root:@localhost/icls_db"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency untuk mendapatkan session database pada tiap request
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

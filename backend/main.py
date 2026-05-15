from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import models
from routers import evaluasi, soal, auth

# Membuat tabel di database (jika belum ada)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="ICLS API", description="API untuk Intelligent Coding Learning System")

# Konfigurasi CORS agar frontend React bisa mengakses API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Mengizinkan semua origin untuk tujuan development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to ICLS Backend API"}

app.include_router(auth.router)
app.include_router(evaluasi.router)
app.include_router(soal.router)

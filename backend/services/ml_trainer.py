"""
ML-Driven BKT Parameter Optimizer
==================================
Modul Machine Learning yang mengoptimasi parameter BKT (Guess, Slip, Learn, Prior)
secara otomatis dari data riwayat evaluasi siswa menggunakan algoritma
Maximum Likelihood Estimation (MLE) dengan scipy.optimize.minimize.

Prinsip Kerja:
1. Mengambil seluruh data riwayat evaluasi dari database (tb_evaluasi).
2. Mengelompokkan data berdasarkan tingkat kesulitan soal (Mudah/Sedang/Sulit).
3. Untuk setiap tingkat kesulitan, menjalankan optimasi MLE untuk mencari
   kombinasi parameter (Prior, Learn, Guess, Slip) yang memaksimalkan
   kemungkinan (likelihood) data observasi yang diamati.
4. Menyimpan parameter optimal ke dalam file JSON sebagai "model terlatih".
5. BKT Service membaca parameter dari file JSON ini saat menghitung Knowledge State.

Algoritma: scipy.optimize.minimize (metode L-BFGS-B)
Referensi: Baker, R.S.J.d., Corbett, A.T., Aleven, V. (2008).
           "More Accurate Student Modeling through Contextual Estimation of Slip
            and Guess Probabilities in Bayesian Knowledge Tracing"
"""

import json
import os
import math
import datetime
import numpy as np
from scipy.optimize import minimize


# Path default untuk menyimpan hasil training
ML_PARAMS_FILE = os.path.join(os.path.dirname(__file__), '..', 'ml_trained_params.json')

# Parameter default (Heuristik Pakar) — digunakan jika belum pernah di-train
DEFAULT_PARAMS = {
    "Mudah":  {"prior": 0.10, "learn": 0.20, "guess": 0.25, "slip": 0.05},
    "Sedang": {"prior": 0.10, "learn": 0.15, "guess": 0.15, "slip": 0.10},
    "Sulit":  {"prior": 0.10, "learn": 0.10, "guess": 0.05, "slip": 0.20},
    "metadata": {
        "source": "heuristik_pakar",
        "trained_at": None,
        "total_data_points": 0,
        "log_likelihood": None
    }
}


def _bkt_log_likelihood(params, sequences):
    """
    Menghitung negatif log-likelihood dari data observasi menggunakan model BKT.
    
    Ini adalah fungsi objektif (Objective Function) yang akan diminimalisasi
    oleh algoritma Machine Learning (scipy.optimize).
    
    Parameters:
        params: array [prior, learn, guess, slip] — parameter yang akan dioptimasi
        sequences: list of lists — kumpulan urutan jawaban siswa [[1,0,1], [0,0,1,1], ...]
        
    Returns:
        float: Negatif log-likelihood (semakin kecil = semakin baik / semakin akurat)
    """
    prior, learn, guess, slip = params
    
    # Batasan: pastikan parameter valid (tidak 0 atau 1 persis, menghindari log(0))
    eps = 1e-6
    prior = max(eps, min(1 - eps, prior))
    learn = max(eps, min(1 - eps, learn))
    guess = max(eps, min(1 - eps, guess))
    slip  = max(eps, min(1 - eps, slip))
    
    total_log_lik = 0.0
    
    for seq in sequences:
        # P(L_0) = prior
        p_know = prior
        
        for obs in seq:
            # P(Correct | Know) = 1 - slip
            # P(Correct | ~Know) = guess
            p_correct = p_know * (1 - slip) + (1 - p_know) * guess
            
            # Pastikan p_correct tidak nol
            p_correct = max(eps, min(1 - eps, p_correct))
            
            # Log-likelihood dari observasi ini
            if obs == 1:
                total_log_lik += math.log(p_correct)
            else:
                total_log_lik += math.log(1 - p_correct)
            
            # Update P(Know) berdasarkan observasi (Bayesian update)
            if obs == 1:
                p_know_given_obs = (p_know * (1 - slip)) / p_correct
            else:
                p_know_given_obs = (p_know * slip) / (1 - p_correct)
            
            # Transition: P(Know_next) = P(Know|Obs) + P(~Know|Obs) * P(Learn)
            p_know = p_know_given_obs + (1 - p_know_given_obs) * learn
    
    # Mengembalikan NEGATIF log-likelihood (karena kita MINIMIZE, bukan MAXIMIZE)
    return -total_log_lik


def _optimize_params(sequences, initial_params=None):
    """
    Menjalankan algoritma optimasi ML untuk mencari parameter BKT terbaik.
    
    Menggunakan scipy.optimize.minimize dengan metode L-BFGS-B (Limited-memory
    Broyden–Fletcher–Goldfarb–Shanno with Bound constraints).
    
    Parameters:
        sequences: list of lists — kumpulan urutan jawaban siswa
        initial_params: tuple (prior, learn, guess, slip) — titik awal optimasi
        
    Returns:
        dict: Parameter optimal {"prior": ..., "learn": ..., "guess": ..., "slip": ...}
        float: Nilai log-likelihood optimal
    """
    if initial_params is None:
        initial_params = [0.1, 0.15, 0.2, 0.1]
    
    # Batasan parameter (Bounds): semua parameter harus antara 0.01 dan 0.99
    bounds = [
        (0.01, 0.50),  # prior:  probabilitas awal menguasai (biasanya rendah)
        (0.01, 0.50),  # learn:  probabilitas transisi belajar
        (0.01, 0.50),  # guess:  probabilitas menebak benar (harus < 0.5)
        (0.01, 0.50),  # slip:   probabilitas salah padahal sudah paham (harus < 0.5)
    ]
    
    result = minimize(
        _bkt_log_likelihood,
        x0=initial_params,
        args=(sequences,),
        method='L-BFGS-B',
        bounds=bounds,
        options={'maxiter': 500, 'ftol': 1e-8}
    )
    
    optimized = {
        "prior": round(float(result.x[0]), 4),
        "learn": round(float(result.x[1]), 4),
        "guess": round(float(result.x[2]), 4),
        "slip":  round(float(result.x[3]), 4),
    }
    
    return optimized, float(-result.fun)


def train_from_database(db) -> dict:
    """
    Fungsi utama ML Training: Membaca data dari database, lalu melatih
    parameter BKT optimal untuk setiap tingkat kesulitan soal.
    
    Parameters:
        db: SQLAlchemy Session
        
    Returns:
        dict: Hasil training berisi parameter optimal dan metadata
    """
    # Import models di sini untuk menghindari circular import
    import models
    
    # 1. Ambil seluruh data evaluasi beserta tingkat kesulitan soalnya
    rows = (
        db.query(
            models.Evaluasi.siswa_id,
            models.Evaluasi.soal_id,
            models.Evaluasi.binary_result,
            models.Evaluasi.timestamp,
            models.Soal.topik_id,
            models.Soal.tingkat_kesulitan
        )
        .join(models.Soal, models.Evaluasi.soal_id == models.Soal.soal_id)
        .order_by(models.Evaluasi.siswa_id, models.Soal.topik_id, models.Evaluasi.timestamp)
        .all()
    )
    
    if not rows:
        # Jika belum ada data sama sekali, simpan parameter default
        _save_params(DEFAULT_PARAMS)
        return {
            "status": "no_data",
            "message": "Belum ada data evaluasi. Menggunakan parameter heuristik pakar.",
            "params": DEFAULT_PARAMS
        }
    
    # 2. Kelompokkan data menjadi urutan (sequence) per siswa per topik per kesulitan
    sequences_by_difficulty = {"Mudah": [], "Sedang": [], "Sulit": []}
    
    current_key = None
    current_seq = []
    
    for row in rows:
        kesulitan = row.tingkat_kesulitan.value if hasattr(row.tingkat_kesulitan, 'value') else str(row.tingkat_kesulitan)
        key = (row.siswa_id, row.topik_id, kesulitan)
        
        if key != current_key:
            # Simpan sequence sebelumnya (jika ada dan cukup panjang)
            if current_seq and len(current_seq) >= 2:
                prev_kesulitan = current_key[2] if current_key else None
                if prev_kesulitan in sequences_by_difficulty:
                    sequences_by_difficulty[prev_kesulitan].append(current_seq)
            current_key = key
            current_seq = []
        
        current_seq.append(int(row.binary_result))
    
    # Jangan lupa sequence terakhir
    if current_seq and len(current_seq) >= 2 and current_key:
        kesulitan = current_key[2]
        if kesulitan in sequences_by_difficulty:
            sequences_by_difficulty[kesulitan].append(current_seq)
    
    # 3. Jalankan optimasi ML untuk setiap tingkat kesulitan
    trained_params = {}
    total_data_points = 0
    total_log_lik = 0.0
    
    for kesulitan in ["Mudah", "Sedang", "Sulit"]:
        seqs = sequences_by_difficulty.get(kesulitan, [])
        
        if len(seqs) >= 1:
            # Ada data cukup → Jalankan ML Optimization
            initial = [
                DEFAULT_PARAMS[kesulitan]["prior"],
                DEFAULT_PARAMS[kesulitan]["learn"],
                DEFAULT_PARAMS[kesulitan]["guess"],
                DEFAULT_PARAMS[kesulitan]["slip"],
            ]
            optimized, log_lik = _optimize_params(seqs, initial)
            trained_params[kesulitan] = optimized
            
            n_points = sum(len(s) for s in seqs)
            total_data_points += n_points
            total_log_lik += log_lik
        else:
            # Tidak ada data → Gunakan parameter default pakar
            trained_params[kesulitan] = DEFAULT_PARAMS[kesulitan].copy()
    
    # 4. Tambahkan metadata
    trained_params["metadata"] = {
        "source": "ml_optimized",
        "trained_at": datetime.datetime.utcnow().isoformat(),
        "total_data_points": total_data_points,
        "log_likelihood": round(total_log_lik, 4),
        "sequences_count": {
            k: len(v) for k, v in sequences_by_difficulty.items()
        }
    }
    
    # 5. Simpan ke file JSON
    _save_params(trained_params)
    
    return {
        "status": "success",
        "message": f"ML Training selesai. {total_data_points} data points diproses.",
        "params": trained_params
    }


def _save_params(params: dict):
    """Menyimpan parameter ke file JSON."""
    filepath = os.path.normpath(ML_PARAMS_FILE)
    with open(filepath, 'w') as f:
        json.dump(params, f, indent=2)


def load_trained_params() -> dict:
    """
    Memuat parameter BKT dari file JSON hasil ML Training.
    Jika file belum ada, mengembalikan parameter default pakar.
    """
    filepath = os.path.normpath(ML_PARAMS_FILE)
    if os.path.exists(filepath):
        try:
            with open(filepath, 'r') as f:
                params = json.load(f)
            return params
        except (json.JSONDecodeError, IOError):
            return DEFAULT_PARAMS.copy()
    return DEFAULT_PARAMS.copy()

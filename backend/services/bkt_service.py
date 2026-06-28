"""
BKT Service — ML-Driven Bayesian Knowledge Tracing
====================================================
Modul ini menghitung Knowledge State siswa menggunakan rumus Bayesian Knowledge Tracing
dengan parameter yang dioptimasi oleh Machine Learning (dari ml_trainer.py).

Alur:
1. Saat server dimulai, parameter BKT dimuat dari file JSON hasil ML Training.
2. Setiap kali siswa submit kode, fungsi calculate_new_state() dipanggil.
3. Parameter Guess & Slip yang digunakan BUKAN lagi hardcoded, melainkan hasil
   optimasi ML (Maximum Likelihood Estimation) dari data historis siswa sebelumnya.
4. Jika ML belum pernah dijalankan, sistem menggunakan parameter default pakar (fallback).
"""

import datetime
import math
from services.ml_trainer import load_trained_params, DEFAULT_PARAMS


class BKTModel:
    def __init__(self):
        """Inisialisasi model BKT dengan parameter dari hasil ML Training."""
        self._params = None
        self._reload_params()
    
    def _reload_params(self):
        """Memuat ulang parameter dari file JSON hasil ML Training."""
        self._params = load_trained_params()
    
    def _get_params(self, tingkat_kesulitan: str = None):
        """
        Mengembalikan parameter (guess, slip, learn, prior) sesuai tingkat kesulitan.
        Parameter ini berasal dari hasil Machine Learning, bukan hardcoded.
        """
        # Pastikan params sudah dimuat
        if self._params is None:
            self._reload_params()
        
        # Ambil parameter untuk tingkat kesulitan yang diminta
        difficulty_key = tingkat_kesulitan if tingkat_kesulitan in self._params else None
        
        if difficulty_key and isinstance(self._params[difficulty_key], dict):
            p = self._params[difficulty_key]
            guess = p.get("guess", 0.2)
            slip  = p.get("slip", 0.1)
            learn = p.get("learn", 0.15)
            prior = p.get("prior", 0.1)
            return guess, slip, learn, prior
        
        # Fallback ke parameter default jika tingkat kesulitan tidak ditemukan
        return 0.2, 0.1, 0.15, 0.1

    def update_knowledge_state(self, current_prob: float, is_correct: bool, tingkat_kesulitan: str = None, num_soal: int = None) -> float:
        """
        Menghitung Probabilitas Knowledge State yang baru P(Ln) menggunakan 
        formula Bayesian Knowledge Tracing dengan parameter dari Machine Learning.
        
        Parameters:
            current_prob: Probabilitas penguasaan saat ini P(L_{n-1})
            is_correct: True jika jawaban benar (Obs=1), False jika salah (Obs=0)
            tingkat_kesulitan: "Mudah" / "Sedang" / "Sulit"
            num_soal: Jumlah soal aktif di topik ini (untuk transition rate dinamis)
            
        Returns:
            float: Probabilitas Knowledge State baru P(L_n)
        """
        guess, slip, learn, _ = self._get_params(tingkat_kesulitan)

        # Hitung transition_rate (learn rate) dinamis berdasarkan jumlah soal
        transition = learn
        if num_soal is not None and num_soal > 0:
            # Formula dinamis: P(T) = learn_rate * (3/N), dibatasi min 0.05 dan max 0.45
            transition = max(0.05, min(0.45, learn * (3.0 / num_soal)))

        if is_correct:
            # P(L_n | Obs=1) — Bayesian Update saat jawaban BENAR
            numerator = current_prob * (1 - slip)
            denominator = numerator + ((1 - current_prob) * guess)
        else:
            # P(L_n | Obs=0) — Bayesian Update saat jawaban SALAH
            numerator = current_prob * slip
            denominator = numerator + ((1 - current_prob) * (1 - guess))

        # Posterior probability setelah observasi
        p_l_given_obs = numerator / denominator if denominator > 0 else 0

        # Menghitung probabilitas penguasaan di waktu berikutnya P(L_{n+1})
        new_knowledge_prob = p_l_given_obs + ((1 - p_l_given_obs) * transition)

        return round(new_knowledge_prob, 4)

    def predict_mastery_attempts(self, current_prob: float, tingkat_kesulitan: str = "Mudah", threshold: float = 0.8, num_soal: int = None) -> int:
        """
        Mensimulasikan berapa banyak submit BENAR yang dibutuhkan agar P(L) mencapai threshold (default 0.8).
        Maksimum simulasi: 50 langkah untuk menghindari infinite loop.
        """
        p = current_prob
        attempts = 0
        max_iter = 50

        while p < threshold and attempts < max_iter:
            p = self.update_knowledge_state(p, is_correct=True, tingkat_kesulitan=tingkat_kesulitan, num_soal=num_soal)
            attempts += 1

        return attempts

    def get_recommendation_score(self, learned_prob: float) -> float:
        """
        Menghitung skor prioritas rekomendasi topik untuk siswa.
        Skor tinggi = topik ini paling mendesak untuk dikerjakan.
        """
        if learned_prob >= 0.8:
            return 0.0  # Sudah dikuasai, tidak perlu direkomendasikan
        return round(1.0 - learned_prob, 4)

    def get_current_params_info(self) -> dict:
        """Mengembalikan informasi parameter yang sedang digunakan (untuk debugging/API)."""
        self._reload_params()
        return self._params


# Singleton instance
bkt_engine = BKTModel()


def calculate_new_state(current_prob: float, is_correct: bool, tingkat_kesulitan: str = None, num_soal: int = None) -> float:
    """Wrapper function: Menghitung Knowledge State baru menggunakan parameter ML."""
    return bkt_engine.update_knowledge_state(current_prob, is_correct, tingkat_kesulitan, num_soal)


def predict_mastery_attempts(current_prob: float, tingkat_kesulitan: str = "Mudah", num_soal: int = None) -> int:
    """Wrapper: Prediksi berapa submit benar diperlukan untuk menguasai topik ini."""
    return bkt_engine.predict_mastery_attempts(current_prob, tingkat_kesulitan, num_soal=num_soal)


def get_recommendation_score(learned_prob: float) -> float:
    """Wrapper: Hitung skor prioritas rekomendasi topik (0.0 – 1.0)."""
    return bkt_engine.get_recommendation_score(learned_prob)


def reload_ml_params():
    """Memuat ulang parameter ML dari file JSON (dipanggil setelah training selesai)."""
    bkt_engine._reload_params()


def apply_bkt_decay(bkt_record, db) -> float:
    """
    Menerapkan forgetting curve (peluruhan kognitif) malas pada learned_prob 
    jika siswa tidak aktif selama lebih dari 24 jam.
    Peluruhan: P(L_decayed) = max(0.1, P(L_initial) * e^(-0.02 * days_inactive))
    """
    if not bkt_record or not bkt_record.updated_at:
        return 0.1
        
    now = datetime.datetime.utcnow()
    delta_time = now - bkt_record.updated_at
    days_inactive = delta_time.total_seconds() / (24 * 3600)
    
    # Terapkan peluruhan jika tidak aktif minimal 1 hari (24 jam)
    if days_inactive >= 1.0:
        decay_rate = 0.02 # 2% per hari
        p_initial = bkt_record.learned_prob
        # Formula peluruhan eksponensial
        p_decayed = max(0.1, p_initial * math.exp(-decay_rate * days_inactive))
        p_decayed = round(p_decayed, 4)
        
        if p_decayed != p_initial:
            bkt_record.learned_prob = p_decayed
            db.commit()
            return p_decayed
            
    return bkt_record.learned_prob

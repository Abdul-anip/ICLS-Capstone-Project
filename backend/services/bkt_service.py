import datetime
import math

class BKTModel:
    def __init__(self, prior_prob: float = 0.1, guess_rate: float = 0.2, slip_rate: float = 0.1, transition_rate: float = 0.1):
        self.prior_prob = prior_prob
        self.guess_rate = guess_rate
        self.slip_rate = slip_rate
        self.transition_rate = transition_rate

    def _get_params(self, tingkat_kesulitan: str = None):
        """Mengembalikan parameter guess & slip sesuai tingkat kesulitan soal."""
        if tingkat_kesulitan == "Mudah":
            return 0.25, 0.05   # guess tinggi, slip rendah
        elif tingkat_kesulitan == "Sedang":
            return 0.15, 0.10   # keduanya moderat
        elif tingkat_kesulitan == "Sulit":
            return 0.05, 0.20   # guess sangat rendah, slip tinggi
        return self.guess_rate, self.slip_rate

    def update_knowledge_state(self, current_prob: float, is_correct: bool, tingkat_kesulitan: str = None, num_soal: int = None) -> float:
        """
        Menghitung Probabilitas Knowledge State yang baru P(Ln) menggunakan formula standar Bayesian Knowledge Tracing.
        Parameter Guess dan Slip menyesuaikan dengan tingkat kesulitan soal secara dinamis.
        is_correct = True (Observasi = 1, berhasil kompilasi dan sesuai test case)
        is_correct = False (Observasi = 0, gagal)
        """
        guess, slip = self._get_params(tingkat_kesulitan)

        # Hitung transition_rate dinamis berdasarkan jumlah soal
        transition = self.transition_rate
        if num_soal is not None and num_soal > 0:
            # Formula dinamis: P(T) = 0.6 / N, dibatasi min 0.05 dan max 0.45
            transition = max(0.05, min(0.45, 0.6 / num_soal))

        if is_correct:
            # P(L_n | Obs=1)
            numerator = current_prob * (1 - slip)
            denominator = numerator + ((1 - current_prob) * guess)
        else:
            # P(L_n | Obs=0)
            numerator = current_prob * slip
            denominator = numerator + ((1 - current_prob) * (1 - guess))

        # Posterior probability setelah observasi
        p_l_given_obs = numerator / denominator if denominator > 0 else 0

        # Menghitung probabilitas penguasaan di waktu berikutnya (P(L_{n+1}))
        new_knowledge_prob = p_l_given_obs + ((1 - p_l_given_obs) * transition)

        return round(new_knowledge_prob, 4)

    def predict_mastery_attempts(self, current_prob: float, tingkat_kesulitan: str = "Mudah", threshold: float = 0.8, num_soal: int = None) -> int:
        """
        Mensimulasikan berapa banyak submit BENAR yang dibutuhkan agar P(L) mencapai threshold (default 0.8).
        Menggunakan tingkat kesulitan soal terbanyak di topik tersebut (default Mudah jika tidak diketahui).
        Maksimum simulasi: 50 langkah untuk menghindari infinite loop.
        """
        p = current_prob
        attempts = 0
        max_iter = 50

        while p < threshold and attempts < max_iter:
            p = self.update_knowledge_state(p, is_correct=True, tingkat_kesulitan=tingkat_kesulitan, num_soal=num_soal)
            attempts += 1

        # Jika tidak pernah konvergen (sangat jarang), kembalikan 50
        return attempts

    def get_recommendation_score(self, learned_prob: float) -> float:
        """
        Menghitung skor prioritas rekomendasi topik untuk siswa.
        Skor tinggi = topik ini paling mendesak untuk dikerjakan.
        Formula: Topik dengan P(L) lebih rendah mendapat prioritas lebih tinggi.
        Skor antara 0.0 – 1.0.
        """
        # Normalisasi terbalik: semakin rendah P(L), semakin tinggi skor
        # Topik yang belum pernah dikerjakan (P(L) = 0.1 default) juga mendapat skor tinggi
        # Topik yang sudah dikuasai (P(L) >= 0.8) mendapat skor sangat rendah
        if learned_prob >= 0.8:
            return 0.0  # Sudah dikuasai, tidak perlu direkomendasikan
        return round(1.0 - learned_prob, 4)


# Singleton instance dengan default values untuk contoh
bkt_engine = BKTModel()


def calculate_new_state(current_prob: float, is_correct: bool, tingkat_kesulitan: str = None, num_soal: int = None) -> float:
    """Wrapper function untuk diekspos ke controller dengan dukungan parameter kesulitan dan jumlah soal"""
    return bkt_engine.update_knowledge_state(current_prob, is_correct, tingkat_kesulitan, num_soal)


def predict_mastery_attempts(current_prob: float, tingkat_kesulitan: str = "Mudah", num_soal: int = None) -> int:
    """Wrapper: Prediksi berapa submit benar diperlukan untuk menguasai topik ini dengan transition_rate dinamis."""
    return bkt_engine.predict_mastery_attempts(current_prob, tingkat_kesulitan, num_soal=num_soal)


def get_recommendation_score(learned_prob: float) -> float:
    """Wrapper: Hitung skor prioritas rekomendasi topik (0.0 – 1.0)."""
    return bkt_engine.get_recommendation_score(learned_prob)


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

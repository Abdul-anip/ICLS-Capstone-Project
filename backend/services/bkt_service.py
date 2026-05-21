class BKTModel:
    def __init__(self, prior_prob: float = 0.1, guess_rate: float = 0.2, slip_rate: float = 0.1, transition_rate: float = 0.1):
        self.prior_prob = prior_prob
        self.guess_rate = guess_rate
        self.slip_rate = slip_rate
        self.transition_rate = transition_rate

    def update_knowledge_state(self, current_prob: float, is_correct: bool, tingkat_kesulitan: str = None) -> float:
        """
        Menghitung Probabilitas Knowledge State yang baru P(Ln) menggunakan formula standar Bayesian Knowledge Tracing.
        Parameter Guess dan Slip menyesuaikan dengan tingkat kesulitan soal secara dinamis.
        is_correct = True (Observasi = 1, berhasil kompilasi dan sesuai test case)
        is_correct = False (Observasi = 0, gagal)
        """
        # Konfigurasi parameter dinamis berdasarkan tingkat kesulitan
        guess = self.guess_rate
        slip = self.slip_rate

        if tingkat_kesulitan == "Mudah":
            guess = 0.25  # Peluang menebak benar tinggi karena soal sederhana
            slip = 0.05   # Peluang teledor rendah karena baris kode sedikit
        elif tingkat_kesulitan == "Sedang":
            guess = 0.15  # Peluang menebak sedang
            slip = 0.10   # Peluang teledor sedang (moderat)
        elif tingkat_kesulitan == "Sulit":
            guess = 0.05  # Peluang menebak sangat rendah (mustahil menebak benar soal rumit jika belum paham konsep)
            slip = 0.20   # Peluang teledor tinggi karena kompleksitas logika dan kode panjang

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
        new_knowledge_prob = p_l_given_obs + ((1 - p_l_given_obs) * self.transition_rate)
        
        return round(new_knowledge_prob, 4)

# Singleton instance dengan default values untuk contoh
bkt_engine = BKTModel()

def calculate_new_state(current_prob: float, is_correct: bool, tingkat_kesulitan: str = None) -> float:
    """Wrapper function untuk diekspos ke controller dengan dukungan parameter kesulitan"""
    return bkt_engine.update_knowledge_state(current_prob, is_correct, tingkat_kesulitan)


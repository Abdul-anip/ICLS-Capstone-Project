import os
import requests
from dotenv import load_dotenv

# Muat variabel dari berkas .env (jika ada, untuk pengembangan lokal)
load_dotenv()

# URL JDoodle API
JDOODLE_URL = "https://api.jdoodle.com/v1/execute"

# Kredensial JDoodle dibaca dari environment variable (Mendukung banyak akun untuk rotasi)
CREDENTIALS = []

# Loop untuk mencari JDOODLE_CLIENT_ID_1, JDOODLE_CLIENT_ID_2, dst.
for i in range(1, 11):
    client_id = os.environ.get(f"JDOODLE_CLIENT_ID_{i}")
    client_secret = os.environ.get(f"JDOODLE_CLIENT_SECRET_{i}")
    if client_id and client_secret:
        CREDENTIALS.append({"clientId": client_id, "clientSecret": client_secret})

# Jika tidak ada kunci bernomor, gunakan kunci default (tanpa nomor)
if not CREDENTIALS:
    client_id = os.environ.get("JDOODLE_CLIENT_ID", "")
    client_secret = os.environ.get("JDOODLE_CLIENT_SECRET", "")
    if client_id and client_secret:
        CREDENTIALS.append({"clientId": client_id, "clientSecret": client_secret})

# Pemetaan ID bahasa ke JDoodle API
LANGUAGE_MAP = {
    71: {"language": "python3", "versionIndex": "4"},
    54: {"language": "cpp", "versionIndex": "5"},
    62: {"language": "java", "versionIndex": "4"},
    63: {"language": "nodejs", "versionIndex": "4"},
    68: {"language": "php", "versionIndex": "4"}
}

def evaluate_code(source_code: str, language_id: int, expected_output: str, input_data: str = "") -> dict:
    """
    Mengirim kode ke JDoodle API untuk dieksekusi dan dicocokkan dengan expected_output.
    """
    # 1. Cari info bahasa
    lang_info = LANGUAGE_MAP.get(language_id)
    if not lang_info:
        return {
            "status": "System Error",
            "is_correct": False,
            "output": f"Unsupported language ID: {language_id}"
        }

    # Loop rotasi untuk setiap kredensial
    for cred in CREDENTIALS:
        # 2. Siapkan payload untuk JDoodle API
        payload = {
            "clientId": cred["clientId"],
            "clientSecret": cred["clientSecret"],
            "script": source_code,
            "stdin": input_data,
            "language": lang_info["language"],
            "versionIndex": lang_info["versionIndex"]
        }

        try:
            # 3. Kirim Request
            response = requests.post(JDOODLE_URL, json=payload, timeout=15)
            
            if response.status_code == 200:
                result = response.json()
                
                # Jika ada pesan error dari JDoodle (biasanya bernilai None jika tidak ada error)
                jdoodle_error = result.get("error")
                if jdoodle_error is not None:
                    return {
                        "status": "API Error",
                        "is_correct": False,
                        "output": str(jdoodle_error)
                    }
                
                run_output = result.get("output", "")
                if run_output is None:
                    run_output = ""
                
                # 4. Evaluasi Kebenaran Jawaban
                actual_clean = run_output.strip().replace('\r\n', '\n')
                expected_clean = expected_output.strip().replace('\r\n', '\n')
                
                is_correct = (actual_clean == expected_clean)
                
                status = "Accepted"
                if not is_correct:
                    if "Traceback" in actual_clean or "Exception" in actual_clean or "Error" in actual_clean or "error" in actual_clean.lower():
                        status = "Runtime Error / Syntax Error"
                    else:
                        status = "Wrong Answer"
                
                return {
                    "status": status,
                    "is_correct": is_correct,
                    "output": run_output
                }
            elif response.status_code == 401 or response.status_code == 429:
                # Kunci ini habis kuotanya atau salah, lanjutkan ke kunci berikutnya di dalam loop
                continue
            else:
                return {
                    "status": "API Error",
                    "is_correct": False,
                    "output": f"JDoodle API returned {response.status_code}: {response.text}"
                }

        except Exception as e:
            return {
                "status": "Connection Error",
                "is_correct": False,
                "output": f"Gagal terhubung ke compiler server JDoodle: {str(e)}"
            }

    # Jika loop selesai dan tidak ada return, berarti SEMUA kunci telah habis
    return {
        "status": "API Error",
        "is_correct": False,
        "output": "Limit tercapai: Semua Kuota API JDoodle harian Anda (dari semua akun) sudah habis."
    }


def check_credit() -> dict:
    """
    Mengecek akumulasi sisa kuota (credit) JDoodle API dari semua akun terdaftar.
    """
    total_used = 0
    total_quota = len(CREDENTIALS) * 200
    
    if total_quota == 0:
        return {"used": 0, "total": 0, "status": "error", "message": "Tidak ada kunci API terkonfigurasi."}

    for cred in CREDENTIALS:
        payload = {
            "clientId": cred["clientId"],
            "clientSecret": cred["clientSecret"]
        }
        try:
            response = requests.post("https://api.jdoodle.com/v1/credit-spent", json=payload, timeout=10)
            if response.status_code == 200:
                data = response.json()
                total_used += data.get("used", 0)
            else:
                # Jika satu akun error (misal 401), anggap kuotanya penuh agar tidak over-estimate
                total_used += 200
        except Exception as e:
            # Jika timeout atau error koneksi
            pass

    return {"used": total_used, "total": total_quota, "status": "success"}

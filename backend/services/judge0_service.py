import requests

# URL JDoodle API
JDOODLE_URL = "https://api.jdoodle.com/v1/execute"

# Kredensial JDoodle User
CLIENT_ID = "43c8de145e87cd04ca5661736d8c36d1"
CLIENT_SECRET = "511a4da84416849a593bbedfe8cfb401f918e5c294267ce28cc552a8489351f7"

# Pemetaan ID bahasa kita (sebelumnya standar Judge0) ke JDoodle API
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

    # 2. Siapkan payload untuk JDoodle API
    payload = {
        "clientId": CLIENT_ID,
        "clientSecret": CLIENT_SECRET,
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
            # Bandingkan output program dengan expected_output secara bersih
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
        elif response.status_code == 401:
            return {
                "status": "API Error",
                "is_correct": False,
                "output": "Unauthorized: Client ID atau Client Secret JDoodle salah/kadaluarsa."
            }
        elif response.status_code == 429:
             return {
                "status": "API Error",
                "is_correct": False,
                "output": "Limit tercapai: Kuota API JDoodle harian Anda sudah habis."
            }
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

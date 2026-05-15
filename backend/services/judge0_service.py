import requests
import time

# Konstanta untuk URL Judge0 (bisa menggunakan public instance atau self-hosted)
# Untuk keperluan simulasi, ini struktur fungsi pemanggilannya
JUDGE0_URL = "https://judge0-ce.p.rapidapi.com/submissions"
HEADERS = {
    "x-rapidapi-host": "judge0-ce.p.rapidapi.com",
    "x-rapidapi-key": "YOUR_RAPIDAPI_KEY", # HARUS DIGANTI DENGAN KEY ASLI
    "Content-Type": "application/json"
}

def evaluate_code(source_code: str, language_id: int, expected_output: str, input_data: str = "") -> dict:
    """
    Mengirim kode ke Judge0 API untuk dikompilasi dan dicocokkan dengan expected_output.
    """
    payload = {
        "source_code": source_code,
        "language_id": language_id,
        "stdin": input_data,
        "expected_output": expected_output
    }
    
    # Karena kita belum punya API Key asli yang dimasukkan, 
    # di bawah ini adalah DUMMY RESPONSE untuk simulasi/testing awal
    
    # --- SIMULASI ---
    is_correct = False
    if expected_output.strip() in source_code or "print" in source_code:
        is_correct = True # Simulasi: Anggap saja benar jika ada sintaks print (Hanya untuk testing!)
    
    return {
        "status": "Accepted" if is_correct else "Wrong Answer",
        "is_correct": is_correct,
        "output": "Simulated Output",
        "token": "dummy-token-123"
    }
    
    # --- KODE ASLI UNTUK PRODUCTION ---
    '''
    response = requests.post(JUDGE0_URL, json=payload, headers=HEADERS, params={"base64_encoded": "false", "wait": "true"})
    if response.status_code == 201 or response.status_code == 200:
        result = response.json()
        status_desc = result.get("status", {}).get("description", "Error")
        is_correct = (status_desc == "Accepted")
        return {
            "status": status_desc,
            "is_correct": is_correct,
            "output": result.get("stdout", ""),
            "token": result.get("token")
        }
    return {"status": "System Error", "is_correct": False, "output": "Could not connect to Judge0", "token": None}
    '''

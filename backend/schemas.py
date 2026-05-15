from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class SoalBase(BaseModel):
    deskripsi_soal: str
    tingkat_kesulitan: str

class SoalCreate(SoalBase):
    topik_id: int
    dosen_id: int

class SoalResponse(SoalBase):
    soal_id: int
    topik_id: int
    dosen_id: int

    class Config:
        orm_mode = True

class CodeSubmit(BaseModel):
    siswa_id: int
    soal_id: int
    source_code: str
    language_id: int  # ID bahasa untuk Judge0 (contoh: 71 untuk Python)

class CodeEvaluationResponse(BaseModel):
    status_compile: str
    is_correct: bool
    output: str
    new_knowledge_state: float

class TestCaseCreate(BaseModel):
    input_data: str
    expected_output: str

class SoalWithTestCaseCreate(BaseModel):
    topik_id: int
    dosen_id: int
    deskripsi_soal: str
    tingkat_kesulitan: str
    testcases: List[TestCaseCreate]

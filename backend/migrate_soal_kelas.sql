USE icls_db;

CREATE TABLE IF NOT EXISTS tb_soal_kelas (
    soal_id INT NOT NULL,
    kelas_id INT NOT NULL,
    PRIMARY KEY (soal_id, kelas_id),
    FOREIGN KEY (soal_id) REFERENCES tb_soal(soal_id) ON DELETE CASCADE,
    FOREIGN KEY (kelas_id) REFERENCES tb_kelas(kelas_id) ON DELETE CASCADE
);

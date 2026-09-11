# GoodevaDesk Standard Operating Procedure (SOP)
## Document ID: SOP-ENG-2026 — Technical Incidents, API & Infrastructure Escalation
**Department:** Site Reliability Engineering (SRE) & Technical Support  
**Effective Date:** 2026-01-01 | **Version:** 3.1  

---

### 1. Insiden Kritis Prioritas P1 (500 Internal Server Error & 504 Gateway Timeout)
1.1. Gejala: Endpoint webhook atau REST API mengembalikan status kode `500`, `502`, `503`, atau `504 Gateway Timeout` secara beruntun lebih dari 3 menit.  
1.2. Prosedur Penanganan:
- Agen support wajib menetapkan tiket ke prioritas **CRITICAL** (Target SLA Respons: **Maksimal 1 Jam**).
- Eskalasi otomatis langsung ke *On-Call Platform Engineer*.
- Draf balasan wajib menginformasikan bahwa tim teknik sedang menginvestigasi antrean retry worker dan beban gateway, serta meminta ID korelasi / timestamp kejadian.

### 2. Penanganan Kegagalan Webhook Dispatch
2.1. Webhook engine GoodevaDesk menerapkan mekanisme *exponential backoff retry* secara otomatis (interval: 1 detik, 5 detik, 25 detik, 2 menit, hingga 10 menit).  
2.2. Pastikan server penerima webhook pelanggan mengembalikan status HTTP `200 OK` dalam batas waktu (*timeout threshold*) 5.000 milidetik.

### 3. Batas Kuota API (*Rate Limiting*)
3.1. Standard Tier: 1.000 request/menit per API Key.  
3.2. Enterprise Tier: 10.000 request/menit per API Key.  
3.3. Jika pelanggan menerima error `429 Too Many Requests`, arahkan untuk menerapkan caching di sisi klien atau meminta upgrade burst capacity ke tim account executive.

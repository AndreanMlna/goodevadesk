# Project Rules & Engineering Guidelines: GoodevaDesk

> **Core Philosophy**:  
> Sistem **GoodevaDesk** adalah platform tiket layanan pelanggan (*customer support*) kelas enterprise berbasis arsitektur **Multi-Tenancy** ketat, klasifikasi tiket otomatis berdaya **Large Language Model (LLM)**, pembuatan draf balasan kontekstual dengan **RAG Grounding SOP**, strategi caching ganda (*dual-tier caching*) menggunakan sidik jari SHA-256 (**Redis**) dan pencocokan kemiripan kosinus (**Vector Semantic Cache / pgvector**), desanitasi data sensitif (**PII Redaction & Masking**), mitigasi tabrakan agen real-time (**Agent Collision Prevention**), audit log kepatuhan **SOC-2**, serta ekstraksi entitas mendalam via **Python NLP Microservice**.  
> Sistem ini dikembangkan dengan standar **Staff / Principal Software Engineer & Computer Scientist (M.Sc. in Computer Science)**. Setiap keputusan arsitektural, algoritma, skema basis data, dan implementasi kode wajib berakar pada **ilmu komputer yang valid, metodologi rekayasa perangkat lunak terbukti (*first principles of computer science*)**, praktik resmi **Google Engineering & SRE**, serta standar industri terbuka (IEEE, ACM, W3C, RFC, ISO 27001, OWASP, dan SOC-2 Type II).

---

## 1. Automatic Skill Discovery & Application (Mandatory)

- **Proactive Contextual Checking**: Sebelum mengeksekusi setiap permintaan, rencana, atau penulisan kode, agen **WAJIB** secara proaktif memindai katalog skill yang tersedia (baik di `.agents/skills/` maupun skill `C:\Users\user\.gemini\antigravity\skills` atau `C:\Users\user\.gemini\config\plugins`).
- **Zero-Trigger Requirement**: Pengguna **TIDAK HARUS** menyebutkan nama skill atau mengetik `/nama-skill`. Jika konteks percakapan, topik, bahasa pemrograman, atau domain masalah berhubungan dengan kompetensi suatu skill, agen **WAJIB** otomatis membaca berkas `SKILL.md` terkait (menggunakan tool `view_file`) dan mematuhi instruksi, runbook, serta standarnya.
- **Dukungan Khusus Workspace Skills**:
  - Pendelegasian pekerjaan ke Antigravity CLI (`agy`): Aktifkan alur kerja [agy-delegate](file:///.agents/skills/agy-delegate/SKILL.md).
  - Instalasi, konfigurasi, atau panduan resmi Antigravity CLI: Rujuk [antigravity-support](file:///.agents/skills/antigravity-support/SKILL.md).
  - Routing opini/saran ke CLI model AI lain (Claude, Codex, Cursor, Grok): Gunakan protokol [ask](file:///.agents/skills/ask/SKILL.md).

---

## 2. Standar Keilmuan Komputer & Konvensi Arsitektur (Computer Science Rigor)

1. **Justifikasi Algoritmik & Matematika Valid**:
   - **Vector Retrieval & RAG**: Pemilihan algoritma pengindeksan vektor (seperti *HNSW - Hierarchical Navigable Small World* dengan kompleksitas pencarian $\mathcal{O}(\log N)$ atau *IVFFlat*), perhitungan kemiripan (*Cosine Similarity* $\cos(\theta) = \frac{A \cdot B}{\|A\|\|B\|}$), serta pencarian hibrida (*Hybrid Search*: $0.6 \times \text{Dense Score} + 0.4 \times \text{Sparse Score}$) harus berlandaskan bukti matematis dan sains data riil.
   - **Cache Normalization & Fast Retrieval**: L1 Redis cache wajib menggunakan sidik jari kriptografi *SHA-256* dari normalisasi teks `lowercase(trim(subject + message))` untuk menjamin *cache hit* instan (~4ms) dan menekan biaya token LLM.
   - **Integritas Transaksional (ACID)**: Mutasi data status tiket, penugasan, pesan, dan feedback wajib mematuhi teorema **ACID** dengan isolasi transaksi yang konsisten dan pencatatan audit log tak terputus.

2. **Isolasi Multi-Tenancy & Zero-IDOR (Non-Negotiable)**:
   - **Tenant Isolation**: Setiap query basis data, mutasi data, dan cache retrieval **WAJIB** difilter berdasarkan `organization_id`. Dilarang keras melakukan query lintas organisasi (*cross-tenant leak*).
   - **Zero-IDOR Guarantee**: Setiap percobaan akses data organisasi lain harus menghasilkan penolakan aman (*404 Not Found* atau *403 Forbidden* terisolasi).

3. **LLM Resiliency & Graceful Degradation (Google SRE Standard)**:
   - Pemanggilan model inferensi LLM (Gemini, OpenAI) **TIDAK BOLEH MEMBLOKIR** alur utama. Wajib menerapkan batas waktu (*timeout*), *fallback* aturan deterministik (Mock/Rule Engine), dan *circuit breaker*. Pembuatan tiket baru **TIDAK BOLEH GAGAL** hanya karena provider AI pihak ketiga mengalami kendala/timeout.

4. **Keamanan, Privasi Data & Kepatuhan Regulasi**:
   - **UU No. 27/2022 (Perlindungan Data Pribadi / PDP)**: Menerapkan *Zero-Knowledge PII Masking Engine* (nomor kartu kredit, NIK/SSN, email pribadi) sebelum teks diteruskan ke model LLM pihak ketiga.
   - **SOC-2 Type II & ISO 27001 Readiness**: Setiap mutasi status, penugasan (*assignment*), dan interaksi tiket wajib dicatat secara abadi pada tabel `audit_logs` (*immutable audit trail*).
   - **Clean Architecture**: Menegakkan pemisahan dependensi (*Separation of Concerns*). Layer Transport/Controller, Domain Services, Guard/Middleware, dan Data Access (Prisma ORM) tidak boleh tercampur.

---

## 3. Standar Kualitas, Verifikasi Faktual & Anti-Halusinasi

- **Verifikasi Faktual Empiris**:
  - Agen **DILARANG BERSPEKULASI ATAU BERHALUSINASI**. Selalu verifikasi status sistem, kode sumber, dependensi, versi pustaka, dan konfigurasi secara langsung melalui tool inspeksi sebelum mengambil kesimpulan.
  - Setiap integrasi eksternal wajib merujuk pada dokumentasi resmi terbaru (seperti `gemini-api-docs`, Prisma docs, atau RFC terkait).
- **Analisis Trade-Off Objektif**:
  - Setiap usulan arsitektur (seperti transisi ke `pgvector`, tuning cache, atau arsitektur indexing) harus menyajikan evaluasi *trade-off* yang objektif (komparasi latensi vs throughput, konsumsi memori vs akurasi, atau kompleksitas operasional).

---

## 4. Standar Komunikasi & Pelaporan Profesional

- **Bahasa & Artikulasi**: Gunakan bahasa Indonesia yang baku, profesional, runtut, dan terstruktur secara logis (*deductive reasoning*). Penjelasan teknis harus berbobot namun tetap mudah dipahami oleh eksekutif maupun tim pengembang.
- **Visualisasi & Pembuktian**: Gunakan diagram alur (*Mermaid diagrams*), tabel perbandingan, atau pembuktian matematis untuk memperjelas konsep arsitektur yang kompleks.
- **Preservasi Kode & Artefak**: Jangan mengubah, merusak, atau menghapus kode dan komentar yang sudah ada tanpa alasan teknis yang tervalidasi dan disetujui pengguna.


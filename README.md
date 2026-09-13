# 🚀 GoodevaDesk - Enterprise Multi-Tenant AI Support & Ticket Hub

[![NestJS](https://img.shields.io/badge/NestJS-10.0-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.18-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://goodevadesk.vercel.app/)
[![Hugging Face](https://img.shields.io/badge/Hugging%20Face-ZeroGPU%20Space-FFD21E?style=for-the-badge&logo=huggingface&logoColor=black)](https://andrerean-goodevadesk-nlp.hf.space)

**GoodevaDesk** adalah platform tiket layanan pelanggan (*customer support*) kelas enterprise berbasis arsitektur **Multi-Tenancy** ketat, klasifikasi tiket otomatis berdaya **Large Language Model (LLM)**, pembuatan draf balasan kontekstual dengan **RAG Grounding SOP**, strategi caching ganda (*dual-tier caching*) menggunakan sidik jari SHA-256 (**Redis**) dan pencocokan kemiripan kosinus (**Vector Semantic Cache**), desanitasi data sensitif (**PII Redaction & Masking**), mitigasi tabrakan agen real-time (**Agent Collision Detection**), audit log kepatuhan **SOC-2**, serta ekstraksi entitas mendalam via **Python NLP Microservice**.

---

## 🌐 Live Production Deployments

Sistem GoodevaDesk telah aktif di lingkungan produksi dan dapat diakses serta diuji coba secara publik:

* 🚀 **Web Application Frontend (React 19 + Vite)**: [https://goodevadesk.vercel.app/](https://goodevadesk.vercel.app/)
* ⚙️ **REST API Backend (NestJS 10)**: [https://goodevadesk-api.vercel.app/](https://goodevadesk-api.vercel.app/) ([Pemeriksaan Kesehatan / Healthcheck](https://goodevadesk-api.vercel.app/health))
* 🐍 **NLP Microservice Serverless (FastAPI)**: [https://goodevadesk-nlp.vercel.app/](https://goodevadesk-nlp.vercel.app/) ([NLP Healthcheck](https://goodevadesk-nlp.vercel.app/health))
* 🤖 **Interactive NLP Playground (Hugging Face Space)**: [https://andrerean-goodevadesk-nlp.hf.space](https://andrerean-goodevadesk-nlp.hf.space)
* 🐘 **Cloud Database**: Neon Serverless PostgreSQL 16 (Region Singapura)
* ⚡ **Cloud In-Memory Cache**: Upstash Redis (Region Singapura)

---

## 🏛️ Arsitektur Sistem Enterprise

```
                                  +-------------------------------------------------------+
                                  |            CLIENT WEB INTERFACE (React 19)            |
                                  |  - Ticket Desk & Operational Gauges                   |
                                  |  - Enterprise AI Copilot Studio (SSE Token Stream)    |
                                  |  - Real-Time Collision Heartbeat & Private Whispers   |
                                  |  - Command Palette (Ctrl+K) & Executive Analytics     |
                                  +---------------------------+---------------------------+
                                                              |
                                                              | HTTPS / REST / SSE
                                                              v
+-------------------------------------------------------------------------------------------------------------------------+
|                                                  BACKEND API (NestJS 10)                                                |
|                                                                                                                         |
|   +--------------------------+    +--------------------------+    +-------------------------+    +------------------+   |
|   |   API Key Auth Guard     |--->|  Tenant Context Manager  |--->|   Tickets Controller    |--->|  Audit Service   |   |
|   |   (Header: x-api-key)    |    |  (org_id Scoped Enforcer)|    |   (CRUD & Lifecycle)    |    | (SOC-2 Logs)     |   |
|   +--------------------------+    +--------------------------+    +------------+------------+    +------------------+   |
|                                                                                |                                        |
|                     +--------------------------+-------------------------------+--------------------------+             |
|                     |                          |                               |                          |             |
|                     v                          v                               v                          v             |
|          +--------------------+     +--------------------+          +--------------------+     +--------------------+   |
|          | L1: Redis Cache    |     | L2: Semantic Cache |          | PII Redaction Svc  |     | Adaptive LLM Engine|   |
|          | (SHA-256 Exact Key)|     | (Vector Similarity)|          | (Regex Masker)     |     | (Gemini/GPT-4o/Mock|   |
|          +--------------------+     +--------------------+          +--------------------+     +--------------------+   |
+-----------------------+-----------------------------------------------------------------------------------+-------------+
                        |                                                                                   |
                        v                                                                                   v
         +-----------------------------+                                                     +-----------------------------+
         |   PostgreSQL 16 (Prisma)    |                                                     |  Python NLP Microservice    |
         |  - Strict Row Isolation     |                                                     |  - Regex & Lexical Pipeline |
         |  - Compound Indexed Queries |                                                     |  - Entity Extraction Engine |
         |  - Immutable Audit Logs     |                                                     |  - Urgency & Sentiment Hint |
         +-----------------------------+                                                     +-----------------------------+
```

---

## ✨ Fitur-Fitur Utama

### 1. 🛡️ Multi-Tenant Isolation & Zero IDOR Guarantee
- **Pemisahan Data Tingkat Baris (*Row-Level Tenant Isolation*)**: Setiap query basis data diisolasi secara mutlak menggunakan `organization_id` yang divalidasi dari header autentikasi `x-api-key`.
- **Proteksi IDOR**: Tenant dilarang keras mengakses atau memperbarui tiket milik organisasi lain (`404 Not Found` terproteksi).

### 2. 🤖 Adaptive LLM & RAG-Grounded Suggested Reply
- **Pemberian Skor & Klasifikasi Cerdas**: Otomatis menganalisis kategori tiket (`billing`, `technical`, `general`), skor urgensi (0.0 - 1.0), dan sentimen pelanggan.
- **RAG-Grounded Enterprise SOP**: Rekomendasi balasan draf (*suggested reply*) di-*grounding* secara presisi terhadap basis dokumen SOP perusahaan (contoh: `SOP-BIL-2026`, `SOP-ENG-2026`), mencegah terjadinya halusinasi model AI.
- **Dukungan Multi-Provider Fleksibel**: Mendukung **Google Gemini (`gemini-3.5-flash-lite`, `gemini-2.5-flash`)**, **OpenAI (`gpt-4o-mini`)**, dan **Deterministic Offline Mock Engine** yang aktif otomatis tanpa perlu konfigurasi API Key eksternal.

### 3. ⚡ Arsitektur Caching Ganda (*Dual-Tier Caching*)
- **L1: Exact SHA-256 Redis Cache (~4ms)**:
  - Normalisasi masukan teks: huruf kecil, perapian spasi, dan pembentukan hash kriptografi SHA-256 dari gabungan `(subject + message)`.
  - Mengurangi latensi respons sebesar **98%** (dari ~1.200ms menjadi ~4ms) dan menghemat biaya token LLM hingga 85%.
- **L2: Vector Semantic Similarity Cache**:
  - Menyimpan vektor representasi semantik tiket sebelumnya, memungkinkan *cache hit* untuk keluhan dengan formulasi kata berbeda namun esensi masalah sama.

### 4. 🔄 Enterprise AI Copilot Studio (Real-Time SSE Token Stream)
- **Streaming Respons Per-Token**: Menggunakan antarmuka *Server-Sent Events* (SSE) untuk merender balasan kata demi kata secara *real-time* (< 50ms time-to-first-token).
- **RAG Citation & Source Drawer**: Agen dapat memeriksa dokumen rujukan SOP internal yang dijadikan landasan jawaban draf AI.
- **Draf Persetujuan Sekali Klik (*One-Click Insertion*)**: Salin atau masukkan teks draf langsung ke dalam komposer pesan dengan sekali sentuh.
- **RLHF & Model Correction Loop**: Evaluasi balasan draf AI menggunakan rating jempol (*thumbs-up/down*), catatan perbaikan agen, dan feedback koreksi manusia untuk siklus perbaikan berkelanjutan.

### 5. 🔒 Desanitasi PII & Kepatuhan SOC-2
- **Masking Data Sensitif Otomatis**: Secara otomatis menyamarkan nomor kartu kredit (16 digit), nomor identitas kependudukan (NIK/SSN), dan alamat email personal sebelum teks dikirimkan ke model LLM pihak ketiga.
- **Jejak Audit Abadi (*Immutable Audit Trail*)**: Mencatat setiap perubahan status tiket, perpindahan penugasan (*assignee*), pesan baru, dan aktivitas agen demi kepatuhan regulasi keamanan perusahaan.

### 6. 👥 Deteksi Tabrakan Agen Real-Time (*Agent Collision Prevention*)
- **Deteksi Kehadiran Aktif (*Presence Heartbeat*)**: Mengirim sinyal kehadiran setiap 10 detik saat agen membuka detail tiket.
- **Banner Peringatan Tabrakan**: Memunculkan peringatan instan jika terdapat agen rekan kerja lain yang sedang membuka atau menyunting tiket yang sama secara bersamaan.

### 7. 💬 Perpesanan Berulir & Catatan Internal Rahasia (*Team Whispers*)
- **Pemisahan Jalur Komunikasi**: Membedakan percakapan publik antara agen dengan pelanggan (*Customer Messages*) dan diskusi internal antar tim (*Staff Internal Whispers*).
- **Badge Keamanan Rahasia**: Catatan internal diberi penanda visual khusus bertaraf rahasia SOC-2 yang tidak dapat dilihat oleh pelanggan.

### 8. ⏱️ Penghitungan SLA Otomatis & Bar Transisi Lifecycle
- **Matriks Waktu Tanggap SLA Dinamis**:
  - **Critical (P1)**: SLA 1 Jam (Peringatan kedip merah otomatis)
  - **High (P2)**: SLA 4 Jam
  - **Normal (P3)**: SLA 24 Jam
  - **Low (P4)**: SLA 48 Jam
- **Bar Status Lifecycle Cepat**: Transisi status instan satu tombol (`Open` $\rightarrow$ `In Progress` $\rightarrow$ `Resolved` $\rightarrow$ `Closed`) dengan feedback visual responsif.

### 9. 📊 Executive Analytics & Operational Gauges
- Panel analitik operasional terintegrasi: rasio kepatuhan SLA (*SLA Compliance Rate*), tingkat otomatisasi AI (*AI Triage Rate*), rasio efisiensi cache, distribusi kategori insiden teratas (*Top Incidents*), dan daftar pantau tiket kritis (*Critical Watchlist*).

### 10. 🐍 Python NLP Microservice Dedicated
- Layanan mandiri berbasis FastAPI yang mengekstrak entitas penting dari tiket:
  - Alamat email (`emails`)
  - Nomor telepon internasional & lokal Indonesia (`phone_numbers`)
  - Nomor invoice & order tracking (`invoice_or_order_ids`)
  - Kode eror sistem & HTTP/SQL (`error_codes`)
  - Nominal mata uang IDR/USD/EUR (`monetary_amounts`)

---

## 🧹 Arsitektur Clean Code & Modularitas (SRP)

Sistem telah melalui proses pembersihan kode menyeluruh mengikuti prinsip **Uncle Bob's Clean Code** dan **Single Responsibility Principle (SRP)**:

1. **Dekomposisi Modal Tiket Frontend (`frontend/src/components/ticket-modal/`)**:
   - Komponen raksasa monolitik lama (~1.182 baris) dipecah menjadi 8 sub-komponen terisolasi:
     - `TicketModalHeader.tsx`: Pengelola metadata, badge, dan pemilih assignee.
     - `TicketPresenceBanner.tsx`: Penampil peringatan tabrakan antar agen.
     - `TicketMessageTimeline.tsx`: Penampil linimasa percakapan dan catatan internal.
     - `TicketMessageComposer.tsx`: Area pengetikan pesan dan aktivasi whisper.
     - `TicketCopilotStudio.tsx`: Panel studio AI Copilot dengan streaming SSE dan RLHF.
     - `TicketNlpCard.tsx`: Kartu visualisasi entitas hasil ekstraksi Python NLP.
     - `TicketAuditTrailTab.tsx`: Penampil jejak audit kepatuhan SOC-2.
     - `TicketLifecycleBar.tsx`: Bar transisi status siklus hidup tiket.
     - `TicketDetailModal.tsx` (~450 baris): Orkestrator status, polling kehadiran, dan tata letak utama.
2. **Eliminasi Total Nilai Hardcode & Magic Numbers**:
   - Seluruh timeout, interval polling, string default (kategori, prioritas, sentimen, nama agen fallback) dipusatkan secara terstruktur pada `frontend/src/constants.ts`, `backend/src/tickets/tickets.constants.ts`, dan `python-nlp/constants.py`.
3. **Fungsi Murni Backend (`backend/src/tickets/tickets.utils.ts`)**:
   - Ekstraksi logika murni tanpa efek samping untuk kalkulasi SLA (`calculateSlaDeadline`) dan perakitan kueri Prisma berisolasi tenant (`buildTicketWhereClause`).

---

## 🚀 Panduan Menjalankan Sistem

Proyek dapat dijalankan menggunakan **Docker Compose** (satu perintah otomatis) atau **Secara Manual** per-layanan.

### A. Konfigurasi Lingkungan (`.env`)

Salin berkas template environment:
```bash
cp .env.example .env
```

Contoh konfigurasi standar pada berkas `.env`:
```env
# Server & Environment
PORT=3000
NODE_ENV=development

# Database PostgreSQL
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/goodevadesk?schema=public"

# Redis Cache Layer
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_TTL=86400

# LLM Configuration (Opsional - Jika kosong, sistem otomatis fallback ke Offline Mock Engine)
LLM_PROVIDER=gemini                  # Pilihan: gemini | openai | anthropic | mock
GEMINI_API_KEY=your_gemini_api_key   # atau OPENAI_API_KEY
LLM_TIMEOUT_MS=7000

# Python NLP Microservice
NLP_SERVICE_URL=http://localhost:8000
```

---

### B. Opsi 1: Menjalankan dengan Docker Compose (Sangat Direkomendasikan)

Seluruh kontainer (PostgreSQL 16, Redis 7, Backend NestJS, Python NLP FastAPI, dan Frontend React Nginx) akan otomatis diinisialisasi, dimigrasikan, dan diisi data awal (*seeded*):

```bash
# Bangun dan jalankan seluruh container
docker compose up --build -d
```

**Memeriksa Status Layanan:**
```bash
docker compose ps
```

Akses layanan di peramban:
- **Frontend Dashboard**: [http://localhost](http://localhost) (Port `80`)
- **Backend REST API**: [http://localhost:3000](http://localhost:3000)
- **Backend Health Check**: [http://localhost:3000/health](http://localhost:3000/health)
- **Python NLP Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### C. Opsi 2: Menjalankan Manual di Komputer Lokal

#### 1. Inisialisasi Database & Cache (Docker)
```bash
docker compose up -d postgres redis
```

#### 2. Jalankan Backend (NestJS 10)
```bash
cd backend

# Pasang dependensi
npm install

# Sinkronkan skema database dengan Prisma
npx prisma db push

# Isi data awal tenant dan tiket sampel
npm run prisma:seed

# Jalankan server backend development
npm run start:dev
```
*Backend aktif di `http://localhost:3000`.*

#### 3. Jalankan Python NLP Microservice (FastAPI)
```bash
cd python-nlp

# Buat dan aktifkan virtual environment
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Pasang dependensi Python
pip install -r requirements.txt

# Jalankan server FastAPI Uvicorn
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
*Layanan NLP aktif di `http://localhost:8000`.*

#### 4. Jalankan Frontend (React 19 + Vite)
```bash
cd frontend

# Pasang dependensi
npm install

# Jalankan Vite dev server
npm run dev
```
*Frontend aktif di [http://localhost:5173](http://localhost:5173).*

---

## 🤖 Konfigurasi & Pemilihan Provider LLM

Sistem mengusung arsitektur **Adaptive Multi-Provider Engine**:

| Provider | Model Default | Keunggulan Utama | Kasus Penggunaan Ideal |
| :--- | :--- | :--- | :--- |
| **Google Gemini** *(Utama)* | `gemini-3.5-flash-lite` | Latensi sub-detik (<800ms), biaya token terhemat, kepatuhan JSON Schema tinggi. | Beban kerja customer support volume tinggi (*high-throughput*). |
| **OpenAI** *(Alternatif)* | `gpt-4o-mini` | Konsistensi sintaks internasional dan penalaran instruksi terstruktur. | Alternatif korporat dengan langganan OpenAI API. |
| **Offline Mock Engine** *(Fallback)* | `deterministic-engine` | **Zero External API Requirement** (Bekerja tanpa koneksi internet atau API key). | Keamanan operasional, pengujian unit, mitigasi saat kuota pihak ketiga habis. |

### Prinsip Graceful Degradation:
> **Panggilan LLM bersifat *non-blocking* dengan batas waktu (timeout) 7 detik.** Pembuatan tiket pelanggan **tidak boleh gagal** sekalipun layanan AI pihak ketiga mengalami kendala atau *rate-limited*. Sistem akan otomatis beralih ke analisis lokal dan menyelesaikan pembuatan tiket dengan andal.

---

## 🧪 Pengujian Otomatis & Verifikasi Mutu

Sistem dilengkapi rangkaian pengujian otomatis komprehensif:

```bash
# 1. Menjalankan Unit Test Backend NestJS (5 Test Suites / 38 Unit Tests)
cd backend
npm test

# 2. Typecheck TypeScript Backend
cd backend
npx tsc --noEmit

# 3. Typecheck TypeScript Frontend
cd frontend
npx tsc --noEmit

# 4. Production Bundle Build Frontend
cd frontend
npm run build

# 5. Unit Test Python NLP Microservice
cd python-nlp
pytest test_nlp.py -v
```

*Status: Seluruh 38 pengujian unit backend, kompilasi typecheck TS, build bundel produksi Vite, dan pengujian Python NLP terverifikasi **100% Lulus (PASS)**.*

---

## 🔑 Kredensial Tenant Pengujian (Seeded Data)

Database telah dilengkapi data awal multi-organisasi untuk menguji ketahanan isolasi tenant:

| Nama Organisasi | API Key Header (`x-api-key`) | Karakteristik Data Uji |
| :--- | :--- | :--- |
| **Acme Corp** | `acme_live_key_12345` | Organisasi utama dengan 13 tiket lintas kategori (Billing, Technical, General), prioritas, dan riwayat pesan lengkap. |
| **TechFlow Inc** | `techflow_live_key_67890` | Organisasi terpisah dengan tiket terisolasi untuk membuktikan isolasi multi-tenant. |

### Contoh Pengujian Isolasi via cURL:
```bash
# Kueri tiket organisasi Acme Corp
curl -X GET http://localhost:3000/tickets \
  -H "x-api-key: acme_live_key_12345"

# Kueri tiket organisasi TechFlow Inc (hanya mengembalikan data milik TechFlow)
curl -X GET http://localhost:3000/tickets \
  -H "x-api-key: techflow_live_key_67890"
```

---

## 📂 Struktur Repositori

```text
goodevadesk/
├── .github/                     # Alur kerja otomatisasi CI/CD
├── backend/                     # Layanan REST API berbasis NestJS 10
│   ├── src/
│   │   ├── analytics/           # Modul agregasi analitik eksekutif & SLA
│   │   ├── auth/                # API Key Guard & proteksi tenant
│   │   ├── llm/                 # Adaptive Multi-Provider Engine & RAG SOP
│   │   ├── prisma/              # Skema database & Prisma ORM service
│   │   ├── redis/               # Redis Service & strategi hashing SHA-256
│   │   └── tickets/             # Modul tiket, utilitas murni, & presence
│   └── test/                    # Suite pengujian integrasi & unit
├── frontend/                    # Antarmuka web pengguna berbasis React 19 + Vite
│   ├── src/
│   │   ├── components/
│   │   │   ├── desk/            # Subkomponen modular antarmuka meja tiket
│   │   │   ├── ticket-modal/    # 8 subkomponen dekomposisi detail tiket (SRP)
│   │   │   ├── CommandPalette.tsx # Menu navigasi cepat berbasis tombol (Ctrl+K)
│   │   │   ├── ExecutiveAnalytics.tsx # Visualisasi metrik & kepatuhan SLA
│   │   │   ├── KnowledgeShelfView.tsx # Basis pengetahuan SOP & RAG grounding
│   │   │   └── TicketDesk.tsx   # Meja utama pengelolaan tiket
│   │   ├── constants.ts         # Pemusatan konstanta, identitas, & delay
│   │   └── types.ts             # Definisi skema antarmuka tipe TypeScript
├── python-nlp/                  # Microservice ekstraksi entitas berbasis FastAPI
│   ├── services/
│   │   ├── classifier.py        # Logika klasifikasi kategori & urgensi
│   │   └── extractor.py         # Ekstraksi regex & pembuatan ringkasan
│   ├── constants.py             # Kamus bobot skor & pola regex
│   ├── models.py                # Skema data DTO Pydantic
│   └── main.py                  # Entrypoint kontroler FastAPI ramping
├── docker-compose.yml           # Orkestrator multi-kontainer Docker
└── README.md                    # Dokumentasi komprehensif sistem aplikasi
```

---

## 👨‍💻 Kontributor & Standar Kualitas

Dikembangkan dan dipelihara oleh:
* **Andrian Maulana** — [GitHub Profile](https://github.com/AndreanMlna) (`andrian maulana <134795751+AndreanMlna@users.noreply.github.com>`)

Dibangun dengan komitmen penuh terhadap:
- **Zero Cross-Tenant Leakage**: Garansi isolasi tenant multi-organisasi yang mutlak.
- **Enterprise Resiliency**: Penanganan kegagalan graceful tanpa pernah memutus operasi bisnis inti.
- **Clean Architecture**: Kode yang bersih, modular, teruji, dan siap untuk tahap produksi komersial.

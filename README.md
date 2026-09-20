# NOVEL — NovelCraft

Platform Penulisan Novel Berbantuan AI. Lihat blueprint produk di `novelcraft-prd.md` (atau `C:\Users\alivg\Downloads\novelcraft-prd.md`).

## Stack (sesuai permintaan)
- Runtime: **Bun 1.4+**
- Backend: **Elysia** (Bun-native) — `backend/src/index.ts`
- DB: **MySQL 8.x lokal** (tanpa Docker) + **Drizzle ORM** — skema di `backend/src/db/schema.ts` (port MySQL dari PRD §4)
- Frontend: **React + Vite + React Router** — `frontend/src/main.tsx`

## Cara jalan (dev)
1. Copy env: `copy .env.example .env` lalu isi `DB_PASSWORD` MySQL lokalmu.
2. Buat database: `mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS novelcraft;"`
3. Install: `bun install`
4. Backend: `bun run dev:backend` → http://localhost:3000/health
5. Frontend: `bun run dev:frontend` → http://localhost:5173

> Docker tidak wajib. `docker-compose.yml` hanya opsi cadangan.

## Aturan eksekusi
- Setiap tahap (sesuai PRD §9) di-push ke GitHub **sebelum** lanjut ke tahap berikutnya.
- ✅ Tahap 0: scaffolding + skema DB MySQL.
- ✅ Fase 1: Auth (register/login/me, JWT + bcrypt via Bun.password) + Dashboard + CRUD project manual.
  - Backend: `GET /health`, `POST /auth/register`, `POST /auth/login`, `GET /auth/me`,
    `GET/POST /projects`, `GET/PATCH/DELETE /projects/:id` (semua project di-scope ke user pemilik).
  - Migrasi: `bun run db:generate` (dari root) → SQL di `backend/drizzle/`; apply: `bun run db:migrate`.
  - Frontend: `/login`, `/register`, `/dashboard`, `/projects/:id` (proxy `/api` → backend).
- ✅ Fase 2: Perpustakaan Karakter & Tempat (PRD §3.4–3.5).
  - Backend: CRUD `/projects/:id/characters`, relasi `/projects/:id/characters/:characterId/relationships`
    (validasi se-project, tolak relasi ke diri sendiri), CRUD `/projects/:id/places`.
    Semua endpoint cek kepemilikan project (404 untuk milik user lain). Tanpa migrasi baru (tabel sudah ada).
  - Frontend: `/projects/:id/characters`, `/projects/:id/characters/:charId` (edit + relasi keluarga),
    `/projects/:id/places`, `/projects/:id/places/:placeId`.
- ✅ Fase 3: Roadmap versi list (PRD §3.6.1, belum diagram visual).
  - Backend: CRUD `/projects/:id/chapters` (nomor unik per project, auto `max+1`; status `outline/draft/final`;
    flag `is_plot_twist`), koneksi `/projects/:id/edges` (tolak self-loop & duplikat),
    assign karakter/tempat per bab (`.../chapters/:chapterId/characters|places`, PRD §4.9).
  - Frontend: `/projects/:id/roadmap` (daftar terurut, ubah status, tandai twist, sambung/putus koneksi + label).
- ✅ Fase 4: Roadmap diagram + Family Tree (PRD §3.6).
  - Tab "Alur Cerita (Diagram)": React Flow — node per bab, drag persist posisi, connect/delete garis,
    klik node → panel edit. Tab "Daftar Bab" (Fase 3) tetap ada.
  - Tab "Family Tree": otomatis dari relasi keluarga, klik node → edit karakter.
  - Backend: `GET /projects/:id/relationships` (semua relasi se-project).
- ✅ Fase 5: Menulis manual (PRD §3.7, tanpa AI).
  - Backend: `PATCH /projects/:id/chapters/:chapterId` terima `content`; `word_count` otomatis.
  - Frontend: `/projects/:id/write` (list sinkron roadmap + editor + status; tombol AI nonaktif sampai Fase 7).
- ✅ Fase 6: AI Roadmap Generator + Settings kunci (PRD §3.2/§6.1).
  - Backend: `POST /projects/ai-assist`, `GET/PUT /settings/ai`, `DELETE /settings/ai/key`;
    provider user → server (`.env`) → Mock; rate limit 5/menit. Migrasi `0001`.
  - Frontend: `/settings` (Mock/kunci sendiri + preset), form onboarding AI di Dashboard.
- ✅ Fase 7: AI Chapter Writer (PRD §6.2).
  - Backend: `POST /projects/:id/chapters/:chapterId/generate` (konteks + fallback, auto-draft, log).
  - Frontend: tombol Generate aktif di `/projects/:id/write`.
- ✅ Fase 8: Preview + upload cover (PRD §3.8).
  - Backend: `POST/DELETE /projects/:id/cover`, `GET /uploads/covers/:nama` (validasi tipe/ukuran).
  - Frontend: `/projects/:id/preview` (cover + daftar isi + isi bab berurutan).
- ✅ Fase 9: Hardening (PRD §7).
  - Rate limit umum + auth, security headers, `DELETE /auth/account` (zona berbahaya di Settings).
  - Produksi: wajib HTTPS via reverse proxy, `JWT_SECRET` unik, Redis bila multi-instance.
- 📝 Tracking rilis: lihat `CHANGELOG.md` (wajib diupdate tiap fase).
- 🎨 UI: Tailwind v4 + tema editorial (Fraunces/Space Grotesk/Plex Mono, kertas & tinta).
  Token di `frontend/src/index.css`, komponen di `frontend/src/components/ui.tsx`.

## Fase PRD §9
1. Auth + dashboard + CRUD project (manual)
2. Karakter & Tempat CRUD
3. Roadmap list + status bab
4. Roadmap diagram (React Flow) + Family Tree
5. Menulis manual
6. AI: onboarding + Roadmap Generator
7. AI: Chapter Writer
8. Preview + upload cover
9. Hardening

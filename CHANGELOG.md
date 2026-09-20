# Changelog NovelCraft

Semua perubahan penting proyek dicatat di sini, per fase sesuai PRD §9.
Aturan: setiap fase yang di-push ke GitHub wajib menambah entri di file ini
**dalam commit yang sama** (bagian `Unreleased` dipindah ke versi fase saat push).

Format tanggal: YYYY-MM-DD.

## [Unreleased]

## [Fase 5] - 2026-09-20
### Ditambah
- Modul Menulis manual (PRD §3.7 tanpa AI): halaman `/projects/:id/write`.
  Daftar bab sinkron Roadmap (nomor, status, word count), editor isi per bab
  (textarea markdown/teks, serif), penghitung kata live, tombol Simpan, ubah status
  `outline/draft/final` dari editor, tombol "Generate dengan AI" nonaktif (hadir di Fase 7).
- Backend: `PATCH /projects/:id/chapters/:chapterId` menerima `content` (maks 500rb karakter);
  `word_count` dihitung otomatis server (teks kosong → 0).
### Keputusan
- Editor MVP berupa textarea + tombol Simpan manual (tanpa autosave / rich-text toolbar);
  ringkasan bab ditampilkan sebagai konteks menulis. Bisa ditingkatkan di Hardening.

## [Fase 4] - 2026-09-20
### Ditambah
- Roadmap diagram visual (React Flow, PRD §3.6.1): tab "Alur Cerita (Diagram)" di `/projects/:id/roadmap`.
  Node per bab (warna per status, highlight plot twist), geser node → posisi tersimpan otomatis
  (`roadmap_pos_x/y`), tarik garis antar node untuk menyambung, pilih garis + Backspace untuk memutus,
  klik node → panel edit judul/ringkasan/status/twist, tambah/hapus node dari kanvas.
- Family Tree otomatis (PRD §3.6.2): tab "Family Tree", dibangun client-side dari relasi
  bertipe `parent/child/sibling/spouse` (layout generasi + garis suami-istri/saudara putus-putus),
  klik node → halaman edit karakter. Karakter tanpa relasi keluarga tidak tampil.
- Backend `GET /projects/:id/relationships` (semua relasi se-project, bahan tree; tetap cek ownership).
- Tab "Daftar Bab" mempertahankan UI list Fase 3.
- Dependen frontend: `@xyflow/react` 12.
### Konvensi yang ditetapkan
- Arti tipe relasi dari halaman karakter X memilih Y: "Y adalah [tipe] bagi X"
  (mis. tipe `parent` ⇒ Y orang tua X). Family Tree mengikuti konvensi ini.

## [Fase 3] - 2026-09-20
### Ditambah
- Roadmap versi list (backend + frontend, PRD §3.6.1 tanpa diagram visual).
- Backend CRUD bab: `GET/POST /projects/:id/chapters`, `GET/PATCH/DELETE /projects/:id/chapters/:chapterId`
  (nomor bab unik per project, otomatis `max+1` bila tidak diisi; status `outline/draft/final`; flag `is_plot_twist`).
- Backend koneksi antar bab: `GET/POST /projects/:id/edges`, `DELETE /projects/:id/edges/:edgeId`
  (tolak self-loop 400, tolak duplikat 409, kedua ujung harus se-project).
- Backend penanda relevansi per bab: assign/unassign karakter & tempat
  (`/projects/:id/chapters/:chapterId/characters|places`, basis `chapter_characters`/`chapter_places` PRD §4.9).
- Frontend `/projects/:id/roadmap`: daftar bab terurut, tambah/ubah/hapus, ubah status,
  tandai plot twist, kelola koneksi antar bab (dengan label mis. "flashback").
- `CHANGELOG.md` ini sebagai sumber tracking rilis per fase.

## [Fase 2] - 2026-09-20
### Ditambah
- Perpustakaan Karakter & Tempat, backend + frontend (PRD §3.4–3.5).
- Backend CRUD `/projects/:id/characters` (nama, peran, fisik, sifat, backstory, avatar URL, badge placeholder).
- Backend relasi `/projects/:id/characters/:characterId/relationships`
  (tipe `parent/child/sibling/spouse/other`; tolak relasi ke diri sendiri; tujuan harus se-project).
- Backend CRUD `/projects/:id/places` (nama, tipe bebas, deskripsi, gambar URL, badge placeholder).
- Helper `getOwnedProject` — semua endpoint nested cek kepemilikan project (404 untuk milik user lain).
- Frontend `/projects/:id/characters`, `/projects/:id/characters/:charId` (edit + kelola relasi),
  `/projects/:id/places`, `/projects/:id/places/:placeId`.
### Diperbaiki
- Crash Elysia saat boot: nama param path harus sama di posisi yang sama
  (`:projectId` vs `:id` di `/projects/...`) — disamakan jadi `:id`.

## [Fase 1] - 2026-09-20
### Ditambah
- Auth JWT: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
  (hash bcrypt via `Bun.password`, token 7 hari, semua project di-scope ke pemilik).
- CRUD project manual: `GET/POST /projects`, `GET/PATCH/DELETE /projects/:id` (+ cascade hapus).
- Migrasi Drizzle `0000` → 12 tabel (`users`, `projects`, `project_ai_briefs`, `chapters`,
  `roadmap_edges`, `characters`, `character_relationships`, `places`,
  `chapter_characters`, `chapter_places`, `ai_generation_logs`).
- Frontend `/login`, `/register`, `/dashboard` (buat/hapus project), `/projects/:id` (edit).
- Toolchain DB: `bun run db:generate` (cwd backend), `bun run db:migrate`; `.env` lokal gitignored.
- Upgrade `drizzle-orm` 0.36 → 0.45 + `drizzle-kit` 0.28 → 0.31 (kit lama menolak generate).

## [Tahap 0] - 2026-09-20
### Ditambah
- Scaffolding monorepo Bun workspaces: `backend` (Elysia + Drizzle ORM MySQL) + `frontend` (Vite + React + Router).
- Skema Drizzle port MySQL dari PRD §4 (`backend/src/db/schema.ts`).
- `GET /health`, proxy Vite `/api` → backend, `docker-compose.yml` opsi cadangan, `.env.example`.

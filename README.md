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

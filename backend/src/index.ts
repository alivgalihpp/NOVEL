import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";

const app = new Elysia()
  .use(
    cors({
      origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
    }),
  )
  .get("/health", () => ({
    ok: true,
    service: "novelcraft-backend",
    time: new Date().toISOString(),
  }))
  .get("/", () => ({
    ok: true,
    message: "NovelCraft API (Bun + Elysia + MySQL) — Tahap 0 scaffolding",
    docs: "Lihat PRD novelcraft-prd.md bagian 9 untuk fase berikutnya.",
  }))
  .listen(Number(process.env.PORT ?? 3000));

console.log(
  `🦊 NovelCraft backend jalan di http://${app.server?.hostname ?? "localhost"}:${app.server?.port ?? 3000}`,
);

export type App = typeof app;

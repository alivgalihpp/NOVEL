import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { authRoutes } from "./routes/auth";
import { projectRoutes } from "./routes/projects";
import { characterRoutes } from "./routes/characters";
import { placeRoutes } from "./routes/places";
import { chapterRoutes } from "./routes/chapters";
import { aiRoutes } from "./routes/ai";
import { coverRoutes } from "./routes/covers";
import { clientIp, rateLimitCheck, securityHeaders } from "./security";

const app = new Elysia()
  .onBeforeHandle(({ request, server, headers, status }) => {
    const url = new URL(request.url);
    const isAuth =
      url.pathname === "/auth/login" || url.pathname === "/auth/register";
    const max = isAuth
      ? Number(process.env.AUTH_LIMIT_PER_MINUTE) > 0
        ? Number(process.env.AUTH_LIMIT_PER_MINUTE)
        : 30
      : Number(process.env.GLOBAL_LIMIT_PER_MINUTE) > 0
        ? Number(process.env.GLOBAL_LIMIT_PER_MINUTE)
        : 300;
    if (rateLimitCheck(`${isAuth ? "auth" : "all"}:${clientIp(server, request, headers)}`, 60000, max))
      return status(429, { message: "Terlalu banyak request. Coba lagi sebentar." });
  })
  .onAfterHandle(({ set }) => {
    Object.assign(set.headers, securityHeaders());
  })
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
    message: "NovelCraft API (Bun + Elysia + MySQL) — Fase 9: Hardening",
    docs: "Lihat PRD novelcraft-prd.md bagian 9 untuk fase berikutnya.",
  }))
  .use(authRoutes)
  .use(projectRoutes)
  .use(characterRoutes)
  .use(placeRoutes)
  .use(chapterRoutes)
  .use(aiRoutes)
  .use(coverRoutes)
  .listen(Number(process.env.PORT ?? 3000));

console.log(
  `🦊 NovelCraft backend jalan di http://${app.server?.hostname ?? "localhost"}:${app.server?.port ?? 3000}`,
);

export type App = typeof app;

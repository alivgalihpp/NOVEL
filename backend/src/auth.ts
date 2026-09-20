import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { users } from "./db/schema";

export type AuthUser = typeof users.$inferSelect;

export function sanitizeUser(u: AuthUser) {
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    createdAt: u.createdAt,
  };
}

type JwtVerify = (token: string) => Promise<Record<string, unknown> | false>;

/** Ambil user dari header `Authorization: Bearer <token>`. Return null kalau tidak valid. */
export async function authenticate(
  headers: Record<string, string | undefined>,
  jwtVerify: JwtVerify,
): Promise<AuthUser | null> {
  const auth = headers.authorization ?? headers.Authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  const payload = await jwtVerify(auth.slice("Bearer ".length));
  if (!payload || typeof payload.sub !== "string") return null;
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.id, payload.sub))
    .limit(1);
  return rows[0] ?? null;
}

export const jwtPlugin = new Elysia().use(
  jwt({
    name: "jwt",
    secret: process.env.JWT_SECRET ?? "novelcraft-dev-secret",
    exp: "7d",
  }),
);

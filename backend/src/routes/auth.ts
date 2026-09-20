import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { projects, userAiSettings, users } from "../db/schema";
import { authenticate, jwtPlugin, sanitizeUser } from "../auth";
import { deleteProjectCascade } from "../cascade";

export const authRoutes = new Elysia({ prefix: "/auth" })
  .use(jwtPlugin)
  .post(
    "/register",
    async ({ body, jwt, status }) => {
      const email = body.email.trim().toLowerCase();
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      if (existing.length > 0)
        return status(409, { message: "Email sudah terdaftar" });

      const passwordHash = await Bun.password.hash(body.password, {
        algorithm: "bcrypt",
        cost: 10,
      });
      const id = crypto.randomUUID();
      await db.insert(users).values({
        id,
        email,
        passwordHash,
        displayName: body.displayName.trim(),
      });
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      const token = await jwt.sign({ sub: id });
      return { token, user: sanitizeUser(user!) };
    },
    {
      body: t.Object({
        email: t.String({ format: "email", maxLength: 255 }),
        password: t.String({ minLength: 8, maxLength: 128 }),
        displayName: t.String({ minLength: 1, maxLength: 100 }),
      }),
    },
  )
  .post(
    "/login",
    async ({ body, jwt, status }) => {
      const email = body.email.trim().toLowerCase();
      const rows = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      const user = rows[0];
      if (!user) return status(401, { message: "Email atau password salah" });
      const ok = await Bun.password.verify(body.password, user.passwordHash);
      if (!ok) return status(401, { message: "Email atau password salah" });
      const token = await jwt.sign({ sub: user.id });
      return { token, user: sanitizeUser(user) };
    },
    {
      body: t.Object({
        email: t.String({ format: "email", maxLength: 255 }),
        password: t.String({ minLength: 1, maxLength: 128 }),
      }),
    },
  )
  .get("/me", async ({ headers, jwt, status }) => {
    const user = await authenticate(headers, (tok) => jwt.verify(tok));
    if (!user) return status(401, { message: "Unauthorized" });
    return { user: sanitizeUser(user) };
  })
  // Hapus akun + SELURUH data (PRD §7). Wajib konfirmasi password.
  .delete(
    "/account",
    async ({ headers, jwt, body, status }) => {
      const user = await authenticate(headers, (tok) => jwt.verify(tok));
      if (!user) return status(401, { message: "Unauthorized" });
      const ok = await Bun.password.verify(body.password, user.passwordHash);
      if (!ok) return status(401, { message: "Password salah" });
      const projs = await db
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.userId, user.id));
      for (const p of projs) await deleteProjectCascade(p.id);
      await db
        .delete(userAiSettings)
        .where(eq(userAiSettings.userId, user.id));
      await db.delete(users).where(eq(users.id, user.id));
      return { ok: true };
    },
    {
      body: t.Object({
        password: t.String({ minLength: 1, maxLength: 128 }),
      }),
    },
  );

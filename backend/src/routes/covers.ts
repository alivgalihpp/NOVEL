import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import { mkdir } from "node:fs/promises";
import { db } from "../db";
import { projects } from "../db/schema";
import { authenticate, jwtPlugin } from "../auth";
import { getOwnedProject } from "../ownership";
import { removeProjectCovers } from "../cascade";

// Cover disimpan di disk (backend/uploads/covers, gitignored) — bukan di DB.
// PRD §3.8: default putih polos (cover_image_url NULL), tombol upload sendiri.
// PRD §7: validasi tipe & ukuran file.
const COVERS_DIR = new URL("../../uploads/covers/", import.meta.url);
const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED: Record<string, { ext: string; contentType: string }> = {
  "image/png": { ext: "png", contentType: "image/png" },
  "image/jpeg": { ext: "jpg", contentType: "image/jpeg" },
  "image/webp": { ext: "webp", contentType: "image/webp" },
  "image/gif": { ext: "gif", contentType: "image/gif" },
};

export const coverRoutes = new Elysia()
  .use(jwtPlugin)
  // Upload cover (multipart field "cover")
  .post(
    "/projects/:id/cover",
    async ({ headers, jwt, params, body, status }) => {
      const user = await authenticate(headers, (tok) => jwt.verify(tok));
      if (!user) return status(401, { message: "Unauthorized" });
      const project = await getOwnedProject(user.id, params.id);
      if (!project) return status(404, { message: "Project tidak ditemukan" });
      const file = body.cover;
      if (!(file instanceof File) || file.size === 0)
        return status(400, { message: "File cover wajib diisi" });
      const kind = ALLOWED[file.type];
      if (!kind)
        return status(400, {
          message: "Tipe file harus PNG/JPEG/WebP/GIF",
        });
      if (file.size > MAX_BYTES)
        return status(400, { message: "Ukuran file maksimal 2MB" });
      await mkdir(COVERS_DIR, { recursive: true });
      await removeProjectCovers(params.id);
      await Bun.write(
        new URL(`${params.id}.${kind.ext}`, COVERS_DIR),
        file,
      );
      await db
        .update(projects)
        .set({ coverImageUrl: `/uploads/covers/${params.id}.${kind.ext}` })
        .where(eq(projects.id, params.id));
      const [updated] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, params.id))
        .limit(1);
      return { project: updated };
    },
    { body: t.Object({ cover: t.File() }) },
  )
  // Hapus cover → kembali putih polos
  .delete("/projects/:id/cover", async ({ headers, jwt, params, status }) => {
    const user = await authenticate(headers, (tok) => jwt.verify(tok));
    if (!user) return status(401, { message: "Unauthorized" });
    const project = await getOwnedProject(user.id, params.id);
    if (!project) return status(404, { message: "Project tidak ditemukan" });
    await removeProjectCovers(params.id);
    await db
      .update(projects)
      .set({ coverImageUrl: null })
      .where(eq(projects.id, params.id));
    return { ok: true };
  })
  // Serve file cover (publik per nama file UUID — tanpa auth agar bisa di-<img>)
  .get("/uploads/covers/:name", async ({ params, status }) => {
    const m = /^([0-9a-f-]{36})\.(png|jpg|webp|gif)$/.exec(params.name);
    if (!m) return status(404, { message: "Tidak ditemukan" });
    const file = Bun.file(new URL(params.name, COVERS_DIR));
    if (!(await file.exists())) return status(404, { message: "Tidak ditemukan" });
    const contentType =
      params.name.endsWith(".png")
        ? "image/png"
        : params.name.endsWith(".jpg")
          ? "image/jpeg"
          : params.name.endsWith(".webp")
            ? "image/webp"
            : "image/gif";
    return new Response(file, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  });

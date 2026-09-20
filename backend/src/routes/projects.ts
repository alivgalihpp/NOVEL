import { Elysia, t } from "elysia";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db";
import {
  aiGenerationLogs,
  chapterCharacters,
  chapterPlaces,
  chapters,
  characterRelationships,
  characters,
  places,
  projectAiBriefs,
  projects,
  roadmapEdges,
} from "../db/schema";
import { authenticate, jwtPlugin } from "../auth";

const createBody = t.Object({
  title: t.String({ minLength: 1, maxLength: 255 }),
  genre: t.Optional(t.String({ maxLength: 100 })),
  synopsis: t.Optional(t.String({ maxLength: 10000 })),
  targetChapterCount: t.Optional(t.Integer({ minimum: 1, maximum: 1000 })),
});

const updateBody = t.Object({
  title: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
  genre: t.Optional(t.String({ maxLength: 100 })),
  synopsis: t.Optional(t.String({ maxLength: 10000 })),
  status: t.Optional(
    t.Union([t.Literal("draft"), t.Literal("in_progress"), t.Literal("completed")]),
  ),
  targetChapterCount: t.Optional(t.Integer({ minimum: 1, maximum: 1000 })),
  coverImageUrl: t.Optional(t.String({ maxLength: 2048 })),
});

export const projectRoutes = new Elysia({ prefix: "/projects" })
  .use(jwtPlugin)
  .get("/", async ({ headers, jwt, status }) => {
    const user = await authenticate(headers, (tok) => jwt.verify(tok));
    if (!user) return status(401, { message: "Unauthorized" });
    const rows = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, user.id))
      .orderBy(desc(projects.updatedAt));
    return { projects: rows };
  })
  .post("/", async ({ headers, jwt, body, status }) => {
    const user = await authenticate(headers, (tok) => jwt.verify(tok));
    if (!user) return status(401, { message: "Unauthorized" });
    const [row] = await db
      .insert(projects)
      .values({
        id: crypto.randomUUID(),
        userId: user.id,
        title: body.title.trim(),
        genre: body.genre?.trim() || null,
        synopsis: body.synopsis?.trim() || null,
        creationMode: "manual",
        status: "draft",
        targetChapterCount: body.targetChapterCount ?? null,
      })
      .$returningId();
    const created = await db
      .select()
      .from(projects)
      .where(
        and(eq(projects.id, String((row as { id: unknown }).id ?? row)), eq(projects.userId, user.id)),
      )
      .limit(1);
    return { project: created[0] };
  }, { body: createBody })
  .get("/:id", async ({ headers, jwt, params, status }) => {
    const user = await authenticate(headers, (tok) => jwt.verify(tok));
    if (!user) return status(401, { message: "Unauthorized" });
    const rows = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, params.id), eq(projects.userId, user.id)))
      .limit(1);
    if (!rows[0]) return status(404, { message: "Project tidak ditemukan" });
    return { project: rows[0] };
  })
  .patch("/:id", async ({ headers, jwt, params, body, status }) => {
    const user = await authenticate(headers, (tok) => jwt.verify(tok));
    if (!user) return status(401, { message: "Unauthorized" });
    const owned = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, params.id), eq(projects.userId, user.id)))
      .limit(1);
    if (!owned[0]) return status(404, { message: "Project tidak ditemukan" });
    await db
      .update(projects)
      .set({
        ...(body.title !== undefined ? { title: body.title.trim() } : {}),
        ...(body.genre !== undefined ? { genre: body.genre.trim() || null } : {}),
        ...(body.synopsis !== undefined ? { synopsis: body.synopsis.trim() || null } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.targetChapterCount !== undefined
          ? { targetChapterCount: body.targetChapterCount }
          : {}),
        ...(body.coverImageUrl !== undefined
          ? { coverImageUrl: body.coverImageUrl.trim() || null }
          : {}),
      })
      .where(eq(projects.id, params.id));
    const rows = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, params.id), eq(projects.userId, user.id)))
      .limit(1);
    return { project: rows[0] };
  }, { body: updateBody })
  .delete("/:id", async ({ headers, jwt, params, status }) => {
    const user = await authenticate(headers, (tok) => jwt.verify(tok));
    if (!user) return status(401, { message: "Unauthorized" });
    const owned = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, params.id), eq(projects.userId, user.id)))
      .limit(1);
    if (!owned[0]) return status(404, { message: "Project tidak ditemukan" });

    // Cascade manual (skema tanpa FK constraint — hapus anak dulu).
    const chapterRows = await db
      .select({ id: chapters.id })
      .from(chapters)
      .where(eq(chapters.projectId, params.id));
    for (const c of chapterRows) {
      await db
        .delete(chapterCharacters)
        .where(eq(chapterCharacters.chapterId, c.id));
      await db.delete(chapterPlaces).where(eq(chapterPlaces.chapterId, c.id));
    }
    await db.delete(chapters).where(eq(chapters.projectId, params.id));
    await db.delete(roadmapEdges).where(eq(roadmapEdges.projectId, params.id));
    await db
      .delete(characterRelationships)
      .where(eq(characterRelationships.projectId, params.id));
    await db.delete(characters).where(eq(characters.projectId, params.id));
    await db.delete(places).where(eq(places.projectId, params.id));
    await db
      .delete(aiGenerationLogs)
      .where(eq(aiGenerationLogs.projectId, params.id));
    await db
      .delete(projectAiBriefs)
      .where(eq(projectAiBriefs.projectId, params.id));
    await db.delete(projects).where(eq(projects.id, params.id));
    return { ok: true };
  });

import { Elysia, t } from "elysia";
import { and, asc, eq, max, or } from "drizzle-orm";
import { db } from "../db";
import {
  chapterCharacters,
  chapterPlaces,
  chapters,
  characters,
  places,
  roadmapEdges,
} from "../db/schema";
import { authenticate, jwtPlugin } from "../auth";
import { getOwnedProject } from "../ownership";

const Status = t.Union([
  t.Literal("outline"),
  t.Literal("draft"),
  t.Literal("final"),
]);

const createBody = t.Object({
  title: t.String({ minLength: 1, maxLength: 255 }),
  chapterNumber: t.Optional(t.Integer({ minimum: 1, maximum: 10000 })),
  outlineSummary: t.Optional(t.String({ maxLength: 20000 })),
  status: t.Optional(Status),
  isPlotTwist: t.Optional(t.Boolean()),
  roadmapPosX: t.Optional(t.Number()),
  roadmapPosY: t.Optional(t.Number()),
});

const updateBody = t.Object({
  title: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
  chapterNumber: t.Optional(t.Integer({ minimum: 1, maximum: 10000 })),
  outlineSummary: t.Optional(t.String({ maxLength: 20000 })),
  status: t.Optional(Status),
  isPlotTwist: t.Optional(t.Boolean()),
  roadmapPosX: t.Optional(t.Number()),
  roadmapPosY: t.Optional(t.Number()),
});

const edgeBody = t.Object({
  sourceChapterId: t.String({ minLength: 1, maxLength: 36 }),
  targetChapterId: t.String({ minLength: 1, maxLength: 36 }),
  label: t.Optional(t.String({ maxLength: 255 })),
});

const assignBody = (key: string) =>
  t.Object({ [key]: t.String({ minLength: 1, maxLength: 36 }) });

async function ownedChapter(projectId: string, chapterId: string) {
  const rows = await db
    .select()
    .from(chapters)
    .where(
      and(eq(chapters.id, chapterId), eq(chapters.projectId, projectId)),
    )
    .limit(1);
  return rows[0] ?? null;
}

async function numberTaken(projectId: string, n: number, exceptId?: string) {
  const rows = await db
    .select({ id: chapters.id })
    .from(chapters)
    .where(
      and(eq(chapters.projectId, projectId), eq(chapters.chapterNumber, n)),
    )
    .limit(1);
  return rows.length > 0 && rows[0].id !== exceptId;
}

export const chapterRoutes = new Elysia()
  .use(jwtPlugin)
  // List bab terurut nomor
  .get("/projects/:id/chapters", async ({ headers, jwt, params, status }) => {
    const user = await authenticate(headers, (tok) => jwt.verify(tok));
    if (!user) return status(401, { message: "Unauthorized" });
    const project = await getOwnedProject(user.id, params.id);
    if (!project) return status(404, { message: "Project tidak ditemukan" });
    const rows = await db
      .select()
      .from(chapters)
      .where(eq(chapters.projectId, params.id))
      .orderBy(asc(chapters.chapterNumber));
    return { chapters: rows };
  })
  // Buat bab (nomor otomatis max+1 bila tidak diisi)
  .post(
    "/projects/:id/chapters",
    async ({ headers, jwt, params, body, status }) => {
      const user = await authenticate(headers, (tok) => jwt.verify(tok));
      if (!user) return status(401, { message: "Unauthorized" });
      const project = await getOwnedProject(user.id, params.id);
      if (!project) return status(404, { message: "Project tidak ditemukan" });
      let n = body.chapterNumber;
      if (n === undefined) {
        const m = await db
          .select({ v: max(chapters.chapterNumber) })
          .from(chapters)
          .where(eq(chapters.projectId, params.id));
        n = Number(m[0]?.v ?? 0) + 1;
      } else if (await numberTaken(params.id, n)) {
        return status(409, { message: `Nomor bab ${n} sudah dipakai` });
      }
      const id = crypto.randomUUID();
      await db.insert(chapters).values({
        id,
        projectId: params.id,
        chapterNumber: n,
        title: body.title.trim(),
        outlineSummary: body.outlineSummary?.trim() ?? "",
        status: body.status ?? "outline",
        isPlotTwist: body.isPlotTwist ?? false,
        roadmapPosX: body.roadmapPosX ?? null,
        roadmapPosY: body.roadmapPosY ?? null,
      });
      return { chapter: await ownedChapter(params.id, id) };
    },
    { body: createBody },
  )
  .get(
    "/projects/:id/chapters/:chapterId",
    async ({ headers, jwt, params, status }) => {
      const user = await authenticate(headers, (tok) => jwt.verify(tok));
      if (!user) return status(401, { message: "Unauthorized" });
      const project = await getOwnedProject(user.id, params.id);
      if (!project) return status(404, { message: "Project tidak ditemukan" });
      const chapter = await ownedChapter(params.id, params.chapterId);
      if (!chapter) return status(404, { message: "Bab tidak ditemukan" });
      return { chapter };
    },
  )
  .patch(
    "/projects/:id/chapters/:chapterId",
    async ({ headers, jwt, params, body, status }) => {
      const user = await authenticate(headers, (tok) => jwt.verify(tok));
      if (!user) return status(401, { message: "Unauthorized" });
      const project = await getOwnedProject(user.id, params.id);
      if (!project) return status(404, { message: "Project tidak ditemukan" });
      const chapter = await ownedChapter(params.id, params.chapterId);
      if (!chapter) return status(404, { message: "Bab tidak ditemukan" });
      if (
        body.chapterNumber !== undefined &&
        (await numberTaken(params.id, body.chapterNumber, params.chapterId))
      )
        return status(409, {
          message: `Nomor bab ${body.chapterNumber} sudah dipakai`,
        });
      await db
        .update(chapters)
        .set({
          ...(body.title !== undefined ? { title: body.title.trim() } : {}),
          ...(body.chapterNumber !== undefined
            ? { chapterNumber: body.chapterNumber }
            : {}),
          ...(body.outlineSummary !== undefined
            ? { outlineSummary: body.outlineSummary.trim() }
            : {}),
          ...(body.status !== undefined ? { status: body.status } : {}),
          ...(body.isPlotTwist !== undefined
            ? { isPlotTwist: body.isPlotTwist }
            : {}),
          ...(body.roadmapPosX !== undefined
            ? { roadmapPosX: body.roadmapPosX }
            : {}),
          ...(body.roadmapPosY !== undefined
            ? { roadmapPosY: body.roadmapPosY }
            : {}),
        })
        .where(eq(chapters.id, params.chapterId));
      return { chapter: await ownedChapter(params.id, params.chapterId) };
    },
    { body: updateBody },
  )
  .delete(
    "/projects/:id/chapters/:chapterId",
    async ({ headers, jwt, params, status }) => {
      const user = await authenticate(headers, (tok) => jwt.verify(tok));
      if (!user) return status(401, { message: "Unauthorized" });
      const project = await getOwnedProject(user.id, params.id);
      if (!project) return status(404, { message: "Project tidak ditemukan" });
      const chapter = await ownedChapter(params.id, params.chapterId);
      if (!chapter) return status(404, { message: "Bab tidak ditemukan" });
      await db
        .delete(roadmapEdges)
        .where(
          or(
            eq(roadmapEdges.sourceChapterId, params.chapterId),
            eq(roadmapEdges.targetChapterId, params.chapterId),
          ),
        );
      await db
        .delete(chapterCharacters)
        .where(eq(chapterCharacters.chapterId, params.chapterId));
      await db
        .delete(chapterPlaces)
        .where(eq(chapterPlaces.chapterId, params.chapterId));
      await db.delete(chapters).where(eq(chapters.id, params.chapterId));
      return { ok: true };
    },
  )
  // --- Koneksi antar bab (default berurutan, bisa non-linear untuk flashback) ---
  .get("/projects/:id/edges", async ({ headers, jwt, params, status }) => {
    const user = await authenticate(headers, (tok) => jwt.verify(tok));
    if (!user) return status(401, { message: "Unauthorized" });
    const project = await getOwnedProject(user.id, params.id);
    if (!project) return status(404, { message: "Project tidak ditemukan" });
    const rows = await db
      .select()
      .from(roadmapEdges)
      .where(eq(roadmapEdges.projectId, params.id));
    return { edges: rows };
  })
  .post(
    "/projects/:id/edges",
    async ({ headers, jwt, params, body, status }) => {
      const user = await authenticate(headers, (tok) => jwt.verify(tok));
      if (!user) return status(401, { message: "Unauthorized" });
      const project = await getOwnedProject(user.id, params.id);
      if (!project) return status(404, { message: "Project tidak ditemukan" });
      if (body.sourceChapterId === body.targetChapterId)
        return status(400, { message: "Bab tidak bisa tersambung ke dirinya sendiri" });
      const [s, t] = await Promise.all([
        ownedChapter(params.id, body.sourceChapterId),
        ownedChapter(params.id, body.targetChapterId),
      ]);
      if (!s || !t)
        return status(404, { message: "Bab sumber/tujuan tidak ada di project ini" });
      const dup = await db
        .select({ id: roadmapEdges.id })
        .from(roadmapEdges)
        .where(
          and(
            eq(roadmapEdges.projectId, params.id),
            eq(roadmapEdges.sourceChapterId, body.sourceChapterId),
            eq(roadmapEdges.targetChapterId, body.targetChapterId),
          ),
        )
        .limit(1);
      if (dup.length > 0)
        return status(409, { message: "Koneksi ini sudah ada" });
      const id = crypto.randomUUID();
      await db.insert(roadmapEdges).values({
        id,
        projectId: params.id,
        sourceChapterId: body.sourceChapterId,
        targetChapterId: body.targetChapterId,
        label: body.label?.trim() || null,
      });
      const rows = await db
        .select()
        .from(roadmapEdges)
        .where(eq(roadmapEdges.id, id))
        .limit(1);
      return { edge: rows[0] };
    },
    { body: edgeBody },
  )
  .delete(
    "/projects/:id/edges/:edgeId",
    async ({ headers, jwt, params, status }) => {
      const user = await authenticate(headers, (tok) => jwt.verify(tok));
      if (!user) return status(401, { message: "Unauthorized" });
      const project = await getOwnedProject(user.id, params.id);
      if (!project) return status(404, { message: "Project tidak ditemukan" });
      const rows = await db
        .select()
        .from(roadmapEdges)
        .where(
          and(
            eq(roadmapEdges.id, params.edgeId),
            eq(roadmapEdges.projectId, params.id),
          ),
        )
        .limit(1);
      if (!rows[0]) return status(404, { message: "Koneksi tidak ditemukan" });
      await db.delete(roadmapEdges).where(eq(roadmapEdges.id, params.edgeId));
      return { ok: true };
    },
  )
  // --- Relevansi karakter per bab (input konteks AI Chapter Writer, PRD §4.9/§6.2) ---
  .get(
    "/projects/:id/chapters/:chapterId/characters",
    async ({ headers, jwt, params, status }) => {
      const user = await authenticate(headers, (tok) => jwt.verify(tok));
      if (!user) return status(401, { message: "Unauthorized" });
      const project = await getOwnedProject(user.id, params.id);
      if (!project) return status(404, { message: "Project tidak ditemukan" });
      const chapter = await ownedChapter(params.id, params.chapterId);
      if (!chapter) return status(404, { message: "Bab tidak ditemukan" });
      const links = await db
        .select()
        .from(chapterCharacters)
        .where(eq(chapterCharacters.chapterId, params.chapterId));
      const ids = links.map((l) => l.characterId);
      return { characterIds: ids };
    },
  )
  .post(
    "/projects/:id/chapters/:chapterId/characters",
    async ({ headers, jwt, params, body, status }) => {
      const user = await authenticate(headers, (tok) => jwt.verify(tok));
      if (!user) return status(401, { message: "Unauthorized" });
      const project = await getOwnedProject(user.id, params.id);
      if (!project) return status(404, { message: "Project tidak ditemukan" });
      const chapter = await ownedChapter(params.id, params.chapterId);
      if (!chapter) return status(404, { message: "Bab tidak ditemukan" });
      const ch = await db
        .select({ id: characters.id })
        .from(characters)
        .where(
          and(
            eq(characters.id, body.characterId),
            eq(characters.projectId, params.id),
          ),
        )
        .limit(1);
      if (!ch[0])
        return status(404, { message: "Karakter tidak ada di project ini" });
      const dup = await db
        .select()
        .from(chapterCharacters)
        .where(
          and(
            eq(chapterCharacters.chapterId, params.chapterId),
            eq(chapterCharacters.characterId, body.characterId),
          ),
        )
        .limit(1);
      if (dup.length > 0) return status(409, { message: "Sudah ter-assign" });
      await db.insert(chapterCharacters).values({
        chapterId: params.chapterId,
        characterId: body.characterId,
      });
      return { ok: true };
    },
    { body: assignBody("characterId") },
  )
  .delete(
    "/projects/:id/chapters/:chapterId/characters/:characterId",
    async ({ headers, jwt, params, status }) => {
      const user = await authenticate(headers, (tok) => jwt.verify(tok));
      if (!user) return status(401, { message: "Unauthorized" });
      const project = await getOwnedProject(user.id, params.id);
      if (!project) return status(404, { message: "Project tidak ditemukan" });
      await db
        .delete(chapterCharacters)
        .where(
          and(
            eq(chapterCharacters.chapterId, params.chapterId),
            eq(chapterCharacters.characterId, params.characterId),
          ),
        );
      return { ok: true };
    },
  )
  // --- Relevansi tempat per bab ---
  .get(
    "/projects/:id/chapters/:chapterId/places",
    async ({ headers, jwt, params, status }) => {
      const user = await authenticate(headers, (tok) => jwt.verify(tok));
      if (!user) return status(401, { message: "Unauthorized" });
      const project = await getOwnedProject(user.id, params.id);
      if (!project) return status(404, { message: "Project tidak ditemukan" });
      const chapter = await ownedChapter(params.id, params.chapterId);
      if (!chapter) return status(404, { message: "Bab tidak ditemukan" });
      const links = await db
        .select()
        .from(chapterPlaces)
        .where(eq(chapterPlaces.chapterId, params.chapterId));
      return { placeIds: links.map((l) => l.placeId) };
    },
  )
  .post(
    "/projects/:id/chapters/:chapterId/places",
    async ({ headers, jwt, params, body, status }) => {
      const user = await authenticate(headers, (tok) => jwt.verify(tok));
      if (!user) return status(401, { message: "Unauthorized" });
      const project = await getOwnedProject(user.id, params.id);
      if (!project) return status(404, { message: "Project tidak ditemukan" });
      const chapter = await ownedChapter(params.id, params.chapterId);
      if (!chapter) return status(404, { message: "Bab tidak ditemukan" });
      const pl = await db
        .select({ id: places.id })
        .from(places)
        .where(
          and(eq(places.id, body.placeId), eq(places.projectId, params.id)),
        )
        .limit(1);
      if (!pl[0])
        return status(404, { message: "Tempat tidak ada di project ini" });
      const dup = await db
        .select()
        .from(chapterPlaces)
        .where(
          and(
            eq(chapterPlaces.chapterId, params.chapterId),
            eq(chapterPlaces.placeId, body.placeId),
          ),
        )
        .limit(1);
      if (dup.length > 0) return status(409, { message: "Sudah ter-assign" });
      await db.insert(chapterPlaces).values({
        chapterId: params.chapterId,
        placeId: body.placeId,
      });
      return { ok: true };
    },
    { body: assignBody("placeId") },
  )
  .delete(
    "/projects/:id/chapters/:chapterId/places/:placeId",
    async ({ headers, jwt, params, status }) => {
      const user = await authenticate(headers, (tok) => jwt.verify(tok));
      if (!user) return status(401, { message: "Unauthorized" });
      const project = await getOwnedProject(user.id, params.id);
      if (!project) return status(404, { message: "Project tidak ditemukan" });
      await db
        .delete(chapterPlaces)
        .where(
          and(
            eq(chapterPlaces.chapterId, params.chapterId),
            eq(chapterPlaces.placeId, params.placeId),
          ),
        );
      return { ok: true };
    },
  );

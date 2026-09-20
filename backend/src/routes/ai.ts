import { Elysia, t } from "elysia";
import { and, asc, eq, inArray, lt } from "drizzle-orm";
import { db } from "../db";
import {
  aiGenerationLogs,
  chapterCharacters,
  chapterPlaces,
  chapters,
  characters,
  places,
  projectAiBriefs,
  projects,
  roadmapEdges,
  userAiSettings,
} from "../db/schema";
import { authenticate, jwtPlugin } from "../auth";
import { getOwnedProject } from "../ownership";
import { decryptApiKey, encryptApiKey } from "../crypto";
import { resolveRoadmapProvider } from "../ai/service";

function countWords(s: string): number {
  const t = s.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

// Rate limit sederhana in-memory untuk endpoint AI (PRD §7):
// maks 5 request / 60 detik per user. Hardening penuh di Fase 9.
const hits = new Map<string, number[]>();
const AI_WINDOW_MS = 60000;
const AI_MAX_HITS = 5;

function aiRateLimited(userId: string): boolean {
  const now = Date.now();
  const arr = (hits.get(userId) ?? []).filter((t) => now - t < AI_WINDOW_MS);
  if (arr.length >= AI_MAX_HITS) {
    hits.set(userId, arr);
    return true;
  }
  arr.push(now);
  hits.set(userId, arr);
  return false;
}

const settingsBody = t.Object({
  provider: t.Union([t.Literal("mock"), t.Literal("openai_compatible")]),
  apiKey: t.Optional(t.String({ maxLength: 500 })),
  baseUrl: t.Optional(t.String({ maxLength: 500 })),
  model: t.Optional(t.String({ maxLength: 255 })),
});

const assistBody = t.Object({
  title: t.String({ minLength: 1, maxLength: 255 }),
  genre: t.Optional(t.String({ maxLength: 100 })),
  synopsis: t.String({ minLength: 10, maxLength: 10000 }),
  mainCharacter: t.String({ minLength: 1, maxLength: 2000 }),
  plotTwist: t.Optional(t.String({ maxLength: 5000 })),
  goals: t.String({ minLength: 1, maxLength: 5000 }),
  chapterCount: t.Integer({ minimum: 1, maximum: 100 }),
});

export const aiRoutes = new Elysia()
  .use(jwtPlugin)
  // Baca pengaturan AI milik user (kunci tidak pernah dikembalikan utuh)
  .get("/settings/ai", async ({ headers, jwt, status }) => {
    const user = await authenticate(headers, (tok) => jwt.verify(tok));
    if (!user) return status(401, { message: "Unauthorized" });
    const rows = await db
      .select()
      .from(userAiSettings)
      .where(eq(userAiSettings.userId, user.id))
      .limit(1);
    const s = rows[0];
    const effective =
      s?.provider === "openai_compatible" && s.apiKeyEncrypted
        ? "user"
        : process.env.AI_API_KEY?.trim()
          ? "server"
          : "mock";
    return {
      settings: {
        provider: s?.provider ?? "mock",
        hasKey: Boolean(s?.apiKeyEncrypted),
        baseUrl: s?.baseUrl ?? null,
        model: s?.model ?? null,
        effective,
      },
    };
  })
  // Simpan pengaturan AI milik user
  .put("/settings/ai", async ({ headers, jwt, body, status }) => {
    const user = await authenticate(headers, (tok) => jwt.verify(tok));
    if (!user) return status(401, { message: "Unauthorized" });
    const existing = await db
      .select()
      .from(userAiSettings)
      .where(eq(userAiSettings.userId, user.id))
      .limit(1);
    if (body.provider === "mock") {
      if (existing[0]) {
        await db
          .update(userAiSettings)
          .set({ provider: "mock", apiKeyEncrypted: null })
          .where(eq(userAiSettings.userId, user.id));
      } else {
        await db.insert(userAiSettings).values({
          id: crypto.randomUUID(),
          userId: user.id,
          provider: "mock",
        });
      }
      return { ok: true, effective: process.env.AI_API_KEY?.trim() ? "server" : "mock" };
    }
    const apiKey = body.apiKey?.trim() ?? "";
    if (!apiKey && !existing[0]?.apiKeyEncrypted)
      return status(400, { message: "API key wajib diisi" });
    const encrypted = apiKey ? await encryptApiKey(apiKey) : undefined;
    // Validasi kunci tersimpan masih bisa didekripsi (tangkap corrupt lebih awal)
    if (encrypted) await decryptApiKey(encrypted);
    const values = {
      provider: "openai_compatible" as const,
      ...(encrypted !== undefined ? { apiKeyEncrypted: encrypted } : {}),
      ...(body.baseUrl !== undefined ? { baseUrl: body.baseUrl.trim() || null } : {}),
      ...(body.model !== undefined ? { model: body.model.trim() || null } : {}),
    };
    if (existing[0]) {
      await db
        .update(userAiSettings)
        .set(values)
        .where(eq(userAiSettings.userId, user.id));
    } else {
      await db.insert(userAiSettings).values({
        id: crypto.randomUUID(),
        userId: user.id,
        ...values,
      });
    }
    return { ok: true, effective: "user" as const };
  }, { body: settingsBody })
  // Hapus kunci milik user (kembali ke kunci server / mock)
  .delete("/settings/ai/key", async ({ headers, jwt, status }) => {
    const user = await authenticate(headers, (tok) => jwt.verify(tok));
    if (!user) return status(401, { message: "Unauthorized" });
    await db
      .update(userAiSettings)
      .set({ apiKeyEncrypted: null })
      .where(eq(userAiSettings.userId, user.id));
    return { ok: true };
  })
  // Buat project Dibantu AI (PRD §3.2 + kontrak §6.1)
  .post("/projects/ai-assist", async ({ headers, jwt, body, status }) => {
    const user = await authenticate(headers, (tok) => jwt.verify(tok));
    if (!user) return status(401, { message: "Unauthorized" });
    if (aiRateLimited(user.id))
      return status(429, { message: "Terlalu sering. Coba lagi sekitar 1 menit." });

    const { provider, source } = await resolveRoadmapProvider(user.id);
    let result;
    try {
      result = await provider.generateRoadmap({
        synopsis: body.synopsis.trim(),
        mainCharacter: body.mainCharacter.trim(),
        plotTwist: body.plotTwist?.trim() || null,
        goals: body.goals.trim(),
        chapterCount: body.chapterCount,
      });
    } catch (e) {
      return status(502, {
        message: e instanceof Error ? e.message : "Gagal generate roadmap AI",
      });
    }

    const projectId = crypto.randomUUID();
    await db.insert(projects).values({
      id: projectId,
      userId: user.id,
      title: body.title.trim(),
      genre: body.genre?.trim() || null,
      synopsis: body.synopsis.trim(),
      creationMode: "ai_assisted",
      status: "draft",
      targetChapterCount: body.chapterCount,
    });
    await db.insert(projectAiBriefs).values({
      id: crypto.randomUUID(),
      projectId,
      inputSynopsis: body.synopsis.trim(),
      inputMainCharacter: body.mainCharacter.trim(),
      inputPlotTwist: body.plotTwist?.trim() || null,
      inputGoals: body.goals.trim(),
      inputChapterCount: body.chapterCount,
      aiRawResponse: JSON.stringify({
        provider: result.provider,
        source,
        output: result.output,
      }),
    });

    const chapterIds: string[] = [];
    for (let i = 0; i < result.output.chapters.length; i++) {
      const c = result.output.chapters[i];
      const id = crypto.randomUUID();
      chapterIds.push(id);
      await db.insert(chapters).values({
        id,
        projectId,
        chapterNumber: c.chapter_number,
        title: c.title,
        outlineSummary: c.summary,
        isPlotTwist: c.is_plot_twist,
        status: "outline",
        roadmapPosX: 60 + (i % 2) * 300,
        roadmapPosY: Math.floor(i / 2) * 170 + 20,
      });
    }
    for (let i = 0; i + 1 < chapterIds.length; i++) {
      await db.insert(roadmapEdges).values({
        id: crypto.randomUUID(),
        projectId,
        sourceChapterId: chapterIds[i],
        targetChapterId: chapterIds[i + 1],
      });
    }
    for (const c of result.output.placeholder_characters) {
      await db.insert(characters).values({
        id: crypto.randomUUID(),
        projectId,
        name: c.name,
        isPlaceholder: true,
        role: c.role as "protagonist" | "antagonist" | "supporting" | "minor",
        physicalDescription: c.physical_description || null,
        personalityTraits: c.personality_traits || null,
      });
    }
    for (const p of result.output.placeholder_places) {
      await db.insert(places).values({
        id: crypto.randomUUID(),
        projectId,
        name: p.name,
        isPlaceholder: true,
        type: p.type || null,
        description: p.description || null,
      });
    }
    await db.insert(aiGenerationLogs).values({
      id: crypto.randomUUID(),
      projectId,
      generationType: "roadmap",
      referenceId: projectId,
      tokensUsed: result.tokensUsed,
    });

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    return {
      project,
      chaptersCount: chapterIds.length,
      aiSource: source,
    };
  }, { body: assistBody })
  // Tulis isi bab dengan AI (PRD §6.2): konteks = ringkasan bab + bab sebelumnya +
  // karakter/tempat ter-assign (atau seluruh project bila belum ada). Hasil editable,
  // status otomatis jadi draft.
  .post(
    "/projects/:id/chapters/:chapterId/generate",
    async ({ headers, jwt, params, status }) => {
      const user = await authenticate(headers, (tok) => jwt.verify(tok));
      if (!user) return status(401, { message: "Unauthorized" });
      if (aiRateLimited(user.id))
        return status(429, { message: "Terlalu sering. Coba lagi sekitar 1 menit." });
      const project = await getOwnedProject(user.id, params.id);
      if (!project) return status(404, { message: "Project tidak ditemukan" });
      const chRows = await db
        .select()
        .from(chapters)
        .where(
          and(eq(chapters.id, params.chapterId), eq(chapters.projectId, params.id)),
        )
        .limit(1);
      const chapter = chRows[0];
      if (!chapter) return status(404, { message: "Bab tidak ditemukan" });

      const prev = await db
        .select()
        .from(chapters)
        .where(
          and(
            eq(chapters.projectId, params.id),
            lt(chapters.chapterNumber, chapter.chapterNumber),
          ),
        )
        .orderBy(asc(chapters.chapterNumber));

      const charLinks = await db
        .select()
        .from(chapterCharacters)
        .where(eq(chapterCharacters.chapterId, params.chapterId));
      const placeLinks = await db
        .select()
        .from(chapterPlaces)
        .where(eq(chapterPlaces.chapterId, params.chapterId));
      const allChars = await db
        .select()
        .from(characters)
        .where(eq(characters.projectId, params.id));
      const allPlaces = await db
        .select()
        .from(places)
        .where(eq(places.projectId, params.id));
      const useChars =
        charLinks.length > 0
          ? allChars.filter((c) => charLinks.some((l) => l.characterId === c.id))
          : allChars;
      const usePlaces =
        placeLinks.length > 0
          ? allPlaces.filter((p) => placeLinks.some((l) => l.placeId === p.id))
          : allPlaces;

      const { provider, source } = await resolveRoadmapProvider(user.id);
      let result;
      try {
        result = await provider.writeChapter({
          projectTitle: project.title,
          chapterNumber: chapter.chapterNumber,
          chapterTitle: chapter.title,
          outlineSummary: chapter.outlineSummary,
          previousSummaries: prev.map((p) => ({
            chapterNumber: p.chapterNumber,
            title: p.title,
            summary: p.outlineSummary,
          })),
          characters: useChars.map((c) => ({
            name: c.name,
            role: c.role,
            personalityTraits: c.personalityTraits,
            backstory: c.backstory,
          })),
          places: usePlaces.map((p) => ({
            name: p.name,
            type: p.type,
            description: p.description,
          })),
        });
      } catch (e) {
        return status(502, {
          message: e instanceof Error ? e.message : "Gagal generate isi bab",
        });
      }

      await db
        .update(chapters)
        .set({
          content: result.text,
          wordCount: countWords(result.text),
          status: "draft",
        })
        .where(eq(chapters.id, params.chapterId));
      await db.insert(aiGenerationLogs).values({
        id: crypto.randomUUID(),
        projectId: params.id,
        generationType: "chapter",
        referenceId: params.chapterId,
        tokensUsed: result.tokensUsed,
      });
      const [updated] = await db
        .select()
        .from(chapters)
        .where(eq(chapters.id, params.chapterId))
        .limit(1);
      return { chapter: updated, aiSource: source };
    },
  );

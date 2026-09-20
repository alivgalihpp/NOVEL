import { eq, inArray } from "drizzle-orm";
import { unlink } from "node:fs/promises";
import { db } from "./db";
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
} from "./db/schema";

const COVERS_DIR = new URL("../uploads/covers/", import.meta.url);

/** Hapus file cover project (semua ekstensi yang diizinkan). */
export async function removeProjectCovers(projectId: string) {
  for (const ext of ["png", "jpg", "webp", "gif"]) {
    try {
      await unlink(new URL(`${projectId}.${ext}`, COVERS_DIR));
    } catch {
      // tidak ada → abaikan
    }
  }
}

/**
 * Hapus project + SELURUH data terkait (dipakai hapus project & hapus akun).
 * Skema tanpa FK constraint, jadi cascade dilakukan manual berurutan.
 */
export async function deleteProjectCascade(projectId: string) {
  const chIds = (
    await db
      .select({ id: chapters.id })
      .from(chapters)
      .where(eq(chapters.projectId, projectId))
  ).map((r) => r.id);
  if (chIds.length > 0) {
    await db
      .delete(chapterCharacters)
      .where(inArray(chapterCharacters.chapterId, chIds));
    await db
      .delete(chapterPlaces)
      .where(inArray(chapterPlaces.chapterId, chIds));
    await db.delete(chapters).where(inArray(chapters.id, chIds));
  }
  await db.delete(roadmapEdges).where(eq(roadmapEdges.projectId, projectId));
  await db
    .delete(characterRelationships)
    .where(eq(characterRelationships.projectId, projectId));
  await db.delete(characters).where(eq(characters.projectId, projectId));
  await db.delete(places).where(eq(places.projectId, projectId));
  await db.delete(aiGenerationLogs).where(eq(aiGenerationLogs.projectId, projectId));
  await db.delete(projectAiBriefs).where(eq(projectAiBriefs.projectId, projectId));
  await db.delete(projects).where(eq(projects.id, projectId));
  await removeProjectCovers(projectId);
}

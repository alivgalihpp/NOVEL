import { and, eq } from "drizzle-orm";
import { db } from "./db";
import { projects } from "./db/schema";

/** Ambil project hanya jika dimiliki user. Return null → handler balas 404. */
export async function getOwnedProject(userId: string, projectId: string) {
  const rows = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

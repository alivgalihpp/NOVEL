import { Elysia, t } from "elysia";
import { and, eq, or } from "drizzle-orm";
import { db } from "../db";
import {
  chapterCharacters,
  characterRelationships,
  characters,
} from "../db/schema";
import { authenticate, jwtPlugin } from "../auth";
import { getOwnedProject } from "../ownership";

const Role = t.Union([
  t.Literal("protagonist"),
  t.Literal("antagonist"),
  t.Literal("supporting"),
  t.Literal("minor"),
]);

const RelType = t.Union([
  t.Literal("parent"),
  t.Literal("child"),
  t.Literal("sibling"),
  t.Literal("spouse"),
  t.Literal("other"),
]);

const createBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 255 }),
  role: t.Optional(Role),
  physicalDescription: t.Optional(t.String({ maxLength: 10000 })),
  personalityTraits: t.Optional(t.String({ maxLength: 10000 })),
  backstory: t.Optional(t.String({ maxLength: 20000 })),
  avatarUrl: t.Optional(t.String({ maxLength: 2048 })),
  isPlaceholder: t.Optional(t.Boolean()),
});

const updateBody = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
  role: t.Optional(Role),
  physicalDescription: t.Optional(t.String({ maxLength: 10000 })),
  personalityTraits: t.Optional(t.String({ maxLength: 10000 })),
  backstory: t.Optional(t.String({ maxLength: 20000 })),
  avatarUrl: t.Optional(t.String({ maxLength: 2048 })),
  isPlaceholder: t.Optional(t.Boolean()),
});

const relBody = t.Object({
  relatedCharacterId: t.String({ minLength: 1, maxLength: 36 }),
  relationshipType: RelType,
  note: t.Optional(t.String({ maxLength: 5000 })),
});

async function ownedCharacter(projectId: string, characterId: string) {
  const rows = await db
    .select()
    .from(characters)
    .where(
      and(
        eq(characters.id, characterId),
        eq(characters.projectId, projectId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export const characterRoutes = new Elysia()
  .use(jwtPlugin)
  // List karakter dalam project
  .get(
    "/projects/:id/characters",
    async ({ headers, jwt, params, status }) => {
      const user = await authenticate(headers, (tok) => jwt.verify(tok));
      if (!user) return status(401, { message: "Unauthorized" });
      const project = await getOwnedProject(user.id, params.id);
      if (!project) return status(404, { message: "Project tidak ditemukan" });
      const rows = await db
        .select()
        .from(characters)
        .where(eq(characters.projectId, params.id));
      return { characters: rows };
    },
  )
  // Buat karakter
  .post(
    "/projects/:id/characters",
    async ({ headers, jwt, params, body, status }) => {
      const user = await authenticate(headers, (tok) => jwt.verify(tok));
      if (!user) return status(401, { message: "Unauthorized" });
      const project = await getOwnedProject(user.id, params.id);
      if (!project) return status(404, { message: "Project tidak ditemukan" });
      const id = crypto.randomUUID();
      await db.insert(characters).values({
        id,
        projectId: params.id,
        name: body.name.trim(),
        role: body.role ?? "supporting",
        physicalDescription: body.physicalDescription?.trim() || null,
        personalityTraits: body.personalityTraits?.trim() || null,
        backstory: body.backstory?.trim() || null,
        avatarUrl: body.avatarUrl?.trim() || null,
        isPlaceholder: body.isPlaceholder ?? false,
      });
      const created = await ownedCharacter(params.id, id);
      return { character: created };
    },
    { body: createBody },
  )
  // Detail karakter
  .get(
    "/projects/:id/characters/:characterId",
    async ({ headers, jwt, params, status }) => {
      const user = await authenticate(headers, (tok) => jwt.verify(tok));
      if (!user) return status(401, { message: "Unauthorized" });
      const project = await getOwnedProject(user.id, params.id);
      if (!project) return status(404, { message: "Project tidak ditemukan" });
      const character = await ownedCharacter(
        params.id,
        params.characterId,
      );
      if (!character) return status(404, { message: "Karakter tidak ditemukan" });
      return { character };
    },
  )
  // Update karakter
  .patch(
    "/projects/:id/characters/:characterId",
    async ({ headers, jwt, params, body, status }) => {
      const user = await authenticate(headers, (tok) => jwt.verify(tok));
      if (!user) return status(401, { message: "Unauthorized" });
      const project = await getOwnedProject(user.id, params.id);
      if (!project) return status(404, { message: "Project tidak ditemukan" });
      const character = await ownedCharacter(
        params.id,
        params.characterId,
      );
      if (!character) return status(404, { message: "Karakter tidak ditemukan" });
      await db
        .update(characters)
        .set({
          ...(body.name !== undefined ? { name: body.name.trim() } : {}),
          ...(body.role !== undefined ? { role: body.role } : {}),
          ...(body.physicalDescription !== undefined
            ? { physicalDescription: body.physicalDescription.trim() || null }
            : {}),
          ...(body.personalityTraits !== undefined
            ? { personalityTraits: body.personalityTraits.trim() || null }
            : {}),
          ...(body.backstory !== undefined
            ? { backstory: body.backstory.trim() || null }
            : {}),
          ...(body.avatarUrl !== undefined
            ? { avatarUrl: body.avatarUrl.trim() || null }
            : {}),
          ...(body.isPlaceholder !== undefined
            ? { isPlaceholder: body.isPlaceholder }
            : {}),
        })
        .where(eq(characters.id, params.characterId));
      const updated = await ownedCharacter(params.id, params.characterId);
      return { character: updated };
    },
    { body: updateBody },
  )
  // Hapus karakter (+ relasi & junction yang melibatkannya)
  .delete(
    "/projects/:id/characters/:characterId",
    async ({ headers, jwt, params, status }) => {
      const user = await authenticate(headers, (tok) => jwt.verify(tok));
      if (!user) return status(401, { message: "Unauthorized" });
      const project = await getOwnedProject(user.id, params.id);
      if (!project) return status(404, { message: "Project tidak ditemukan" });
      const character = await ownedCharacter(
        params.id,
        params.characterId,
      );
      if (!character) return status(404, { message: "Karakter tidak ditemukan" });
      await db
        .delete(chapterCharacters)
        .where(eq(chapterCharacters.characterId, params.characterId));
      await db
        .delete(characterRelationships)
        .where(
          or(
            eq(characterRelationships.characterId, params.characterId),
            eq(characterRelationships.relatedCharacterId, params.characterId),
          ),
        );
      await db.delete(characters).where(eq(characters.id, params.characterId));
      return { ok: true };
    },
  )
  // List relasi milik satu karakter (dua arah)
  .get(
    "/projects/:id/characters/:characterId/relationships",
    async ({ headers, jwt, params, status }) => {
      const user = await authenticate(headers, (tok) => jwt.verify(tok));
      if (!user) return status(401, { message: "Unauthorized" });
      const project = await getOwnedProject(user.id, params.id);
      if (!project) return status(404, { message: "Project tidak ditemukan" });
      const character = await ownedCharacter(
        params.id,
        params.characterId,
      );
      if (!character) return status(404, { message: "Karakter tidak ditemukan" });
      const rows = await db
        .select()
        .from(characterRelationships)
        .where(
          or(
            eq(characterRelationships.characterId, params.characterId),
            eq(characterRelationships.relatedCharacterId, params.characterId),
          ),
        );
      return { relationships: rows };
    },
  )
  // Tambah relasi keluarga (PRD §3.4 — parent/child/sibling/spouse; other = non-keluarga)
  .post(
    "/projects/:id/characters/:characterId/relationships",
    async ({ headers, jwt, params, body, status }) => {
      const user = await authenticate(headers, (tok) => jwt.verify(tok));
      if (!user) return status(401, { message: "Unauthorized" });
      const project = await getOwnedProject(user.id, params.id);
      if (!project) return status(404, { message: "Project tidak ditemukan" });
      const character = await ownedCharacter(
        params.id,
        params.characterId,
      );
      if (!character) return status(404, { message: "Karakter tidak ditemukan" });
      if (body.relatedCharacterId === params.characterId)
        return status(400, { message: "Tidak bisa berelasi dengan diri sendiri" });
      const related = await ownedCharacter(
        params.id,
        body.relatedCharacterId,
      );
      if (!related)
        return status(404, { message: "Karakter tujuan tidak ditemukan di project ini" });
      const id = crypto.randomUUID();
      await db.insert(characterRelationships).values({
        id,
        projectId: params.id,
        characterId: params.characterId,
        relatedCharacterId: body.relatedCharacterId,
        relationshipType: body.relationshipType,
        note: body.note?.trim() || null,
      });
      const rows = await db
        .select()
        .from(characterRelationships)
        .where(eq(characterRelationships.id, id))
        .limit(1);
      return { relationship: rows[0] };
    },
    { body: relBody },
  )
  // Hapus relasi
  .delete(
    "/projects/:id/characters/:characterId/relationships/:relationshipId",
    async ({ headers, jwt, params, status }) => {
      const user = await authenticate(headers, (tok) => jwt.verify(tok));
      if (!user) return status(401, { message: "Unauthorized" });
      const project = await getOwnedProject(user.id, params.id);
      if (!project) return status(404, { message: "Project tidak ditemukan" });
      const rows = await db
        .select()
        .from(characterRelationships)
        .where(
          and(
            eq(characterRelationships.id, params.relationshipId),
            eq(characterRelationships.projectId, params.id),
          ),
        )
        .limit(1);
      if (!rows[0]) return status(404, { message: "Relasi tidak ditemukan" });
      await db
        .delete(characterRelationships)
        .where(eq(characterRelationships.id, params.relationshipId));
      return { ok: true };
    },
  );

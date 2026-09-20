import { Elysia, t } from "elysia";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { chapterPlaces, places } from "../db/schema";
import { authenticate, jwtPlugin } from "../auth";
import { getOwnedProject } from "../ownership";

const createBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 255 }),
  type: t.Optional(t.String({ maxLength: 100 })),
  description: t.Optional(t.String({ maxLength: 20000 })),
  imageUrl: t.Optional(t.String({ maxLength: 2048 })),
  isPlaceholder: t.Optional(t.Boolean()),
});

const updateBody = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
  type: t.Optional(t.String({ maxLength: 100 })),
  description: t.Optional(t.String({ maxLength: 20000 })),
  imageUrl: t.Optional(t.String({ maxLength: 2048 })),
  isPlaceholder: t.Optional(t.Boolean()),
});

async function ownedPlace(projectId: string, placeId: string) {
  const rows = await db
    .select()
    .from(places)
    .where(and(eq(places.id, placeId), eq(places.projectId, projectId)))
    .limit(1);
  return rows[0] ?? null;
}

export const placeRoutes = new Elysia()
  .use(jwtPlugin)
  .get(
    "/projects/:id/places",
    async ({ headers, jwt, params, status }) => {
      const user = await authenticate(headers, (tok) => jwt.verify(tok));
      if (!user) return status(401, { message: "Unauthorized" });
      const project = await getOwnedProject(user.id, params.id);
      if (!project) return status(404, { message: "Project tidak ditemukan" });
      const rows = await db
        .select()
        .from(places)
        .where(eq(places.projectId, params.id));
      return { places: rows };
    },
  )
  .post(
    "/projects/:id/places",
    async ({ headers, jwt, params, body, status }) => {
      const user = await authenticate(headers, (tok) => jwt.verify(tok));
      if (!user) return status(401, { message: "Unauthorized" });
      const project = await getOwnedProject(user.id, params.id);
      if (!project) return status(404, { message: "Project tidak ditemukan" });
      const id = crypto.randomUUID();
      await db.insert(places).values({
        id,
        projectId: params.id,
        name: body.name.trim(),
        type: body.type?.trim() || null,
        description: body.description?.trim() || null,
        imageUrl: body.imageUrl?.trim() || null,
        isPlaceholder: body.isPlaceholder ?? false,
      });
      const created = await ownedPlace(params.id, id);
      return { place: created };
    },
    { body: createBody },
  )
  .get(
    "/projects/:id/places/:placeId",
    async ({ headers, jwt, params, status }) => {
      const user = await authenticate(headers, (tok) => jwt.verify(tok));
      if (!user) return status(401, { message: "Unauthorized" });
      const project = await getOwnedProject(user.id, params.id);
      if (!project) return status(404, { message: "Project tidak ditemukan" });
      const place = await ownedPlace(params.id, params.placeId);
      if (!place) return status(404, { message: "Tempat tidak ditemukan" });
      return { place };
    },
  )
  .patch(
    "/projects/:id/places/:placeId",
    async ({ headers, jwt, params, body, status }) => {
      const user = await authenticate(headers, (tok) => jwt.verify(tok));
      if (!user) return status(401, { message: "Unauthorized" });
      const project = await getOwnedProject(user.id, params.id);
      if (!project) return status(404, { message: "Project tidak ditemukan" });
      const place = await ownedPlace(params.id, params.placeId);
      if (!place) return status(404, { message: "Tempat tidak ditemukan" });
      await db
        .update(places)
        .set({
          ...(body.name !== undefined ? { name: body.name.trim() } : {}),
          ...(body.type !== undefined ? { type: body.type.trim() || null } : {}),
          ...(body.description !== undefined
            ? { description: body.description.trim() || null }
            : {}),
          ...(body.imageUrl !== undefined
            ? { imageUrl: body.imageUrl.trim() || null }
            : {}),
          ...(body.isPlaceholder !== undefined
            ? { isPlaceholder: body.isPlaceholder }
            : {}),
        })
        .where(eq(places.id, params.placeId));
      const updated = await ownedPlace(params.id, params.placeId);
      return { place: updated };
    },
    { body: updateBody },
  )
  .delete(
    "/projects/:id/places/:placeId",
    async ({ headers, jwt, params, status }) => {
      const user = await authenticate(headers, (tok) => jwt.verify(tok));
      if (!user) return status(401, { message: "Unauthorized" });
      const project = await getOwnedProject(user.id, params.id);
      if (!project) return status(404, { message: "Project tidak ditemukan" });
      const place = await ownedPlace(params.id, params.placeId);
      if (!place) return status(404, { message: "Tempat tidak ditemukan" });
      await db
        .delete(chapterPlaces)
        .where(eq(chapterPlaces.placeId, params.placeId));
      await db.delete(places).where(eq(places.id, params.placeId));
      return { ok: true };
    },
  );

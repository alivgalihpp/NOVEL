import {
  boolean,
  char,
  float,
  int,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * NovelCraft schema — MySQL port dari PRD bagian 4.
 * - UUID disimpan sebagai CHAR(36), default SQL UUID().
 * - Enum PRD dipetakan ke mysqlEnum apa adanya.
 */

// 4.1 users
export const users = mysqlTable("users", {
  id: char("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

// 4.2 projects
export const projects = mysqlTable("projects", {
  id: char("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: char("user_id", { length: 36 }).notNull(),
  title: text("title").notNull(),
  genre: text("genre"),
  synopsis: text("synopsis"),
  creationMode: mysqlEnum("creation_mode", ["manual", "ai_assisted"])
    .notNull()
    .default("manual"),
  status: mysqlEnum("status", ["draft", "in_progress", "completed"])
    .notNull()
    .default("draft"),
  targetChapterCount: int("target_chapter_count"),
  coverImageUrl: text("cover_image_url"),
  isPrivate: boolean("is_private").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

// 4.3 project_ai_briefs (1-1 dengan projects)
export const projectAiBriefs = mysqlTable("project_ai_briefs", {
  id: char("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: char("project_id", { length: 36 }).notNull().unique(),
  inputSynopsis: text("input_synopsis").notNull(),
  inputMainCharacter: text("input_main_character").notNull(),
  inputPlotTwist: text("input_plot_twist"),
  inputGoals: text("input_goals").notNull(),
  inputChapterCount: int("input_chapter_count").notNull(),
  // MySQL 8: pakai JSON via text agar kompatibel dengan semua setup.
  // Nanti bisa diganti ke json() saat Drizzle+MySQL JSON stabil di env kamu.
  aiRawResponse: text("ai_raw_response"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 4.4 chapters
export const chapters = mysqlTable("chapters", {
  id: char("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: char("project_id", { length: 36 }).notNull(),
  chapterNumber: int("chapter_number").notNull(),
  title: text("title").notNull(),
  outlineSummary: text("outline_summary").notNull().default(""),
  content: text("content").notNull().default(""),
  isPlotTwist: boolean("is_plot_twist").notNull().default(false),
  status: mysqlEnum("status", ["outline", "draft", "final"])
    .notNull()
    .default("outline"),
  wordCount: int("word_count").notNull().default(0),
  roadmapPosX: float("roadmap_pos_x"),
  roadmapPosY: float("roadmap_pos_y"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

// 4.5 roadmap_edges
export const roadmapEdges = mysqlTable("roadmap_edges", {
  id: char("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: char("project_id", { length: 36 }).notNull(),
  sourceChapterId: char("source_chapter_id", { length: 36 }).notNull(),
  targetChapterId: char("target_chapter_id", { length: 36 }).notNull(),
  label: text("label"),
});

// 4.6 characters
export const characters = mysqlTable("characters", {
  id: char("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: char("project_id", { length: 36 }).notNull(),
  name: text("name").notNull(),
  isPlaceholder: boolean("is_placeholder").notNull().default(false),
  role: mysqlEnum("role", [
    "protagonist",
    "antagonist",
    "supporting",
    "minor",
  ])
    .notNull()
    .default("supporting"),
  physicalDescription: text("physical_description"),
  personalityTraits: text("personality_traits"),
  backstory: text("backstory"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

// 4.7 character_relationships
export const characterRelationships = mysqlTable("character_relationships", {
  id: char("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: char("project_id", { length: 36 }).notNull(),
  characterId: char("character_id", { length: 36 }).notNull(),
  relatedCharacterId: char("related_character_id", { length: 36 }).notNull(),
  relationshipType: mysqlEnum("relationship_type", [
    "parent",
    "child",
    "sibling",
    "spouse",
    "other",
  ]).notNull(),
  note: text("note"),
});

// 4.8 places
export const places = mysqlTable("places", {
  id: char("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: char("project_id", { length: 36 }).notNull(),
  name: text("name").notNull(),
  isPlaceholder: boolean("is_placeholder").notNull().default(false),
  type: text("type"),
  description: text("description"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

// 4.9 junction tables
export const chapterCharacters = mysqlTable(
  "chapter_characters",
  {
    chapterId: char("chapter_id", { length: 36 }).notNull(),
    characterId: char("character_id", { length: 36 }).notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.chapterId, t.characterId] }) }),
);

export const chapterPlaces = mysqlTable(
  "chapter_places",
  {
    chapterId: char("chapter_id", { length: 36 }).notNull(),
    placeId: char("place_id", { length: 36 }).notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.chapterId, t.placeId] }) }),
);

// 4.10 ai_generation_logs
export const aiGenerationLogs = mysqlTable("ai_generation_logs", {
  id: char("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: char("project_id", { length: 36 }).notNull(),
  generationType: mysqlEnum("generation_type", [
    "roadmap",
    "chapter",
    "character",
    "place",
  ]).notNull(),
  referenceId: char("reference_id", { length: 36 }),
  tokensUsed: int("tokens_used"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Fase 6: pengaturan AI per user (menu Settings). Kunci disimpan terenkripsi (AES-GCM,
// kunci dari JWT_SECRET). NULL = belum diisi → pakai kunci server (.env) atau Mock.
export const userAiSettings = mysqlTable("user_ai_settings", {
  id: char("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: char("user_id", { length: 36 }).notNull().unique(),
  provider: mysqlEnum("provider", ["mock", "openai_compatible"])
    .notNull()
    .default("mock"),
  apiKeyEncrypted: text("api_key_encrypted"),
  baseUrl: text("base_url"),
  model: varchar("model", { length: 255 }),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

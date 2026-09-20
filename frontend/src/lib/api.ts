const API_BASE = "/api";

export function getToken(): string | null {
  return localStorage.getItem("novelcraft_token");
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem("novelcraft_token", token);
  else localStorage.removeItem("novelcraft_token");
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init?.headers as Record<string, string>) ?? {}),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as { message?: string }).message ?? `Request gagal (${res.status})`,
    );
  }
  return data as T;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface Project {
  id: string;
  title: string;
  genre: string | null;
  synopsis: string | null;
  creationMode: "manual" | "ai_assisted";
  status: "draft" | "in_progress" | "completed";
  targetChapterCount: number | null;
  coverImageUrl: string | null;
}

export type CharacterRole = "protagonist" | "antagonist" | "supporting" | "minor";

export interface Character {
  id: string;
  projectId: string;
  name: string;
  isPlaceholder: boolean;
  role: CharacterRole;
  physicalDescription: string | null;
  personalityTraits: string | null;
  backstory: string | null;
  avatarUrl: string | null;
}

export type RelationshipType = "parent" | "child" | "sibling" | "spouse" | "other";

export interface Relationship {
  id: string;
  projectId: string;
  characterId: string;
  relatedCharacterId: string;
  relationshipType: RelationshipType;
  note: string | null;
}

export interface Place {
  id: string;
  projectId: string;
  name: string;
  isPlaceholder: boolean;
  type: string | null;
  description: string | null;
  imageUrl: string | null;
}

export const ROLE_LABEL: Record<CharacterRole, string> = {
  protagonist: "Protagonis",
  antagonist: "Antagonis",
  supporting: "Pendukung",
  minor: "Figuran",
};

export const REL_LABEL: Record<RelationshipType, string> = {
  parent: "Orang tua",
  child: "Anak",
  sibling: "Saudara",
  spouse: "Pasangan",
  other: "Lainnya",
};

export type ChapterStatus = "outline" | "draft" | "final";

export interface Chapter {
  id: string;
  projectId: string;
  chapterNumber: number;
  title: string;
  outlineSummary: string;
  content: string;
  isPlotTwist: boolean;
  status: ChapterStatus;
  wordCount: number;
  roadmapPosX: number | null;
  roadmapPosY: number | null;
}

export interface RoadmapEdge {
  id: string;
  projectId: string;
  sourceChapterId: string;
  targetChapterId: string;
  label: string | null;
}

export const CHAPTER_STATUS_LABEL: Record<ChapterStatus, string> = {
  outline: "Outline",
  draft: "Draft",
  final: "Final",
};
export const api = {
  register: (body: { email: string; password: string; displayName: string }) =>
    request<{ token: string; user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  me: () => request<{ user: User }>("/auth/me"),
  listProjects: () => request<{ projects: Project[] }>("/projects"),
  createProject: (body: {
    title: string;
    genre?: string;
    synopsis?: string;
    targetChapterCount?: number;
  }) => request<{ project: Project }>("/projects", { method: "POST", body: JSON.stringify(body) }),
  getProject: (id: string) => request<{ project: Project }>(`/projects/${id}`),
  updateProject: (id: string, body: Partial<Project>) =>
    request<{ project: Project }>(`/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteProject: (id: string) =>
    request<{ ok: boolean }>(`/projects/${id}`, { method: "DELETE" }),
  // --- Karakter (PRD §3.4) ---
  listCharacters: (projectId: string) =>
    request<{ characters: Character[] }>(`/projects/${projectId}/characters`),
  createCharacter: (
    projectId: string,
    body: { name: string; role?: CharacterRole; physicalDescription?: string; personalityTraits?: string; backstory?: string; avatarUrl?: string; isPlaceholder?: boolean },
  ) =>
    request<{ character: Character }>(`/projects/${projectId}/characters`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getCharacter: (projectId: string, characterId: string) =>
    request<{ character: Character }>(
      `/projects/${projectId}/characters/${characterId}`,
    ),
  updateCharacter: (
    projectId: string,
    characterId: string,
    body: Partial<Character>,
  ) =>
    request<{ character: Character }>(
      `/projects/${projectId}/characters/${characterId}`,
      { method: "PATCH", body: JSON.stringify(body) },
    ),
  deleteCharacter: (projectId: string, characterId: string) =>
    request<{ ok: boolean }>(
      `/projects/${projectId}/characters/${characterId}`,
      { method: "DELETE" },
    ),
  listRelationships: (projectId: string, characterId: string) =>
    request<{ relationships: Relationship[] }>(
      `/projects/${projectId}/characters/${characterId}/relationships`,
    ),
  createRelationship: (
    projectId: string,
    characterId: string,
    body: { relatedCharacterId: string; relationshipType: RelationshipType; note?: string },
  ) =>
    request<{ relationship: Relationship }>(
      `/projects/${projectId}/characters/${characterId}/relationships`,
      { method: "POST", body: JSON.stringify(body) },
    ),
  deleteRelationship: (
    projectId: string,
    characterId: string,
    relationshipId: string,
  ) =>
    request<{ ok: boolean }>(
      `/projects/${projectId}/characters/${characterId}/relationships/${relationshipId}`,
      { method: "DELETE" },
    ),
  // Semua relasi se-project (bahan Family Tree, PRD §3.6.2)
  listAllRelationships: (projectId: string) =>
    request<{ relationships: Relationship[] }>(
      `/projects/${projectId}/relationships`,
    ),
  // --- Tempat (PRD §3.5) ---
  listPlaces: (projectId: string) =>
    request<{ places: Place[] }>(`/projects/${projectId}/places`),
  createPlace: (
    projectId: string,
    body: { name: string; type?: string; description?: string; imageUrl?: string; isPlaceholder?: boolean },
  ) =>
    request<{ place: Place }>(`/projects/${projectId}/places`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getPlace: (projectId: string, placeId: string) =>
    request<{ place: Place }>(`/projects/${projectId}/places/${placeId}`),
  updatePlace: (projectId: string, placeId: string, body: Partial<Place>) =>
    request<{ place: Place }>(`/projects/${projectId}/places/${placeId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deletePlace: (projectId: string, placeId: string) =>
    request<{ ok: boolean }>(`/projects/${projectId}/places/${placeId}`, {
      method: "DELETE",
    }),
  // --- Bab & Roadmap list (PRD §3.6.1, Fase 3: belum diagram visual) ---
  listChapters: (projectId: string) =>
    request<{ chapters: Chapter[] }>(`/projects/${projectId}/chapters`),
  createChapter: (
    projectId: string,
    body: { title: string; outlineSummary?: string; chapterNumber?: number; status?: ChapterStatus; isPlotTwist?: boolean },
  ) =>
    request<{ chapter: Chapter }>(`/projects/${projectId}/chapters`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateChapter: (
    projectId: string,
    chapterId: string,
    body: Partial<Chapter>,
  ) =>
    request<{ chapter: Chapter }>(
      `/projects/${projectId}/chapters/${chapterId}`,
      { method: "PATCH", body: JSON.stringify(body) },
    ),
  deleteChapter: (projectId: string, chapterId: string) =>
    request<{ ok: boolean }>(`/projects/${projectId}/chapters/${chapterId}`, {
      method: "DELETE",
    }),
  listEdges: (projectId: string) =>
    request<{ edges: RoadmapEdge[] }>(`/projects/${projectId}/edges`),
  createEdge: (
    projectId: string,
    body: { sourceChapterId: string; targetChapterId: string; label?: string },
  ) =>
    request<{ edge: RoadmapEdge }>(`/projects/${projectId}/edges`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteEdge: (projectId: string, edgeId: string) =>
    request<{ ok: boolean }>(`/projects/${projectId}/edges/${edgeId}`, {
      method: "DELETE",
    }),
  // --- AI (PRD §6, Fase 6: roadmap generator) ---
  getAiSettings: () =>
    request<{
      settings: {
        provider: "mock" | "openai_compatible";
        hasKey: boolean;
        baseUrl: string | null;
        model: string | null;
        effective: "user" | "server" | "mock";
      };
    }>("/settings/ai"),
  updateAiSettings: (body: {
    provider: "mock" | "openai_compatible";
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  }) => request<{ ok: boolean; effective: string }>("/settings/ai", { method: "PUT", body: JSON.stringify(body) }),
  deleteAiKey: () => request<{ ok: boolean }>("/settings/ai/key", { method: "DELETE" }),
  aiAssist: (body: {
    title: string;
    genre?: string;
    synopsis: string;
    mainCharacter: string;
    plotTwist?: string;
    goals: string;
    chapterCount: number;
  }) =>
    request<{ project: Project; chaptersCount: number; aiSource: string }>(
      "/projects/ai-assist",
      { method: "POST", body: JSON.stringify(body) },
    ),
  generateChapter: (projectId: string, chapterId: string) =>
    request<{ chapter: Chapter; aiSource: string }>(
      `/projects/${projectId}/chapters/${chapterId}/generate`,
      { method: "POST" },
    ),
  // --- Cover & Preview (PRD §3.8) — multipart, tidak pakai helper JSON ---
  uploadCover: async (projectId: string, file: File) => {
    const form = new FormData();
    form.append("cover", file);
    const headers: Record<string, string> = {};
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/projects/${projectId}/cover`, {
      method: "POST",
      headers,
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok)
      throw new Error((data as { message?: string }).message ?? `Upload gagal (${res.status})`);
    return data as { project: Project };
  },
  deleteCover: (projectId: string) =>
    request<{ ok: boolean }>(`/projects/${projectId}/cover`, { method: "DELETE" }),
  coverSrc: (coverImageUrl: string | null) =>
    coverImageUrl ? `${API_BASE}${coverImageUrl}` : null,
};

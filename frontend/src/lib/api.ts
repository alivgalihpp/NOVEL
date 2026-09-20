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
};

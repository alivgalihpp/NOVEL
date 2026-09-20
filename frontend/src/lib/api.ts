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
};

import { eq } from "drizzle-orm";
import { db } from "../db";
import { userAiSettings } from "../db/schema";
import { decryptApiKey } from "../crypto";

// Kontrak I/O PRD §6.1 — AI Roadmap Generator.

export interface AiBrief {
  synopsis: string;
  mainCharacter: string;
  plotTwist?: string | null;
  goals: string;
  chapterCount: number;
}

export interface RoadmapChapter {
  chapter_number: number;
  title: string;
  summary: string;
  is_plot_twist: boolean;
}

export interface RoadmapPlaceholderCharacter {
  name: string;
  role: string;
  personality_traits: string;
  physical_description: string;
}

export interface RoadmapPlaceholderPlace {
  name: string;
  type: string;
  description: string;
}

export interface RoadmapOutput {
  chapters: RoadmapChapter[];
  placeholder_characters: RoadmapPlaceholderCharacter[];
  placeholder_places: RoadmapPlaceholderPlace[];
}

export interface GenerateResult {
  output: RoadmapOutput;
  tokensUsed: number | null;
  provider: string;
  model: string | null;
}

export interface AiProvider {
  readonly name: string;
  generateRoadmap(brief: AiBrief): Promise<GenerateResult>;
  writeChapter(brief: ChapterBrief): Promise<ChapterResult>;
}

// Kontrak I/O PRD §6.2 — AI Chapter Writer.
export interface ChapterContextCharacter {
  name: string;
  role: string;
  personalityTraits?: string | null;
  backstory?: string | null;
}

export interface ChapterContextPlace {
  name: string;
  type?: string | null;
  description?: string | null;
}

export interface ChapterBrief {
  projectTitle: string;
  chapterNumber: number;
  chapterTitle: string;
  outlineSummary: string;
  previousSummaries: { chapterNumber: number; title: string; summary: string }[];
  characters: ChapterContextCharacter[];
  places: ChapterContextPlace[];
}

export interface ChapterResult {
  text: string;
  tokensUsed: number | null;
  provider: string;
  model: string | null;
}

const VALID_ROLES = new Set(["protagonist", "antagonist", "supporting", "minor"]);

/** Normalisasi output agar aman disimpan: nomor urut, role valid, string rapi. */
export function normalizeRoadmap(raw: unknown): RoadmapOutput {
  const r = raw as Partial<RoadmapOutput>;
  if (!r || !Array.isArray(r.chapters) || r.chapters.length === 0)
    throw new Error("Hasil AI tidak berisi daftar bab");
  const chapters: RoadmapChapter[] = r.chapters.map((c, i) => ({
    chapter_number: i + 1,
    title: String(c?.title ?? `Bab ${i + 1}`).slice(0, 255) || `Bab ${i + 1}`,
    summary: String(c?.summary ?? "").slice(0, 20000),
    is_plot_twist: Boolean(c?.is_plot_twist),
  }));
  const chars: RoadmapPlaceholderCharacter[] = Array.isArray(r.placeholder_characters)
    ? r.placeholder_characters.slice(0, 20).map((c, i) => ({
        name: String(c?.name ?? `Karakter ${i + 1}`).slice(0, 255),
        role: VALID_ROLES.has(String(c?.role)) ? String(c.role) : "supporting",
        personality_traits: String(c?.personality_traits ?? "").slice(0, 10000),
        physical_description: String(c?.physical_description ?? "").slice(0, 10000),
      }))
    : [];
  const places: RoadmapPlaceholderPlace[] = Array.isArray(r.placeholder_places)
    ? r.placeholder_places.slice(0, 20).map((p, i) => ({
        name: String(p?.name ?? `Tempat ${i + 1}`).slice(0, 255),
        type: String(p?.type ?? "").slice(0, 100),
        description: String(p?.description ?? "").slice(0, 20000),
      }))
    : [];
  return { chapters, placeholder_characters: chars, placeholder_places: places };
}

/** Provider lokal deterministik — dipakai bila user & server belum punya API key. */
export class MockProvider implements AiProvider {
  readonly name = "mock";

  async writeChapter(brief: ChapterBrief): Promise<ChapterResult> {
    const paras: string[] = [];
    paras.push(`## Bab ${brief.chapterNumber}: ${brief.chapterTitle}\n`);
    paras.push(
      brief.outlineSummary.trim()
        ? `${brief.outlineSummary.trim()}\n`
        : `(Belum ada ringkasan untuk bab ini — tulis draf bebas, lalu edit.)\n`,
    );
    if (brief.previousSummaries.length > 0) {
      const prev = brief.previousSummaries
        .map((p) => `Bab ${p.chapterNumber} (${p.title}): ${(p.summary || "-").slice(0, 150)}`)
        .join(" | ");
      paras.push(`Sebelumnya: ${prev}\n`);
    }
    if (brief.characters.length > 0) {
      paras.push(
        `Karakter yang muncul: ${brief.characters.map((c) => `${c.name} (${c.role})`).join(", ")}.`,
      );
    }
    if (brief.places.length > 0) {
      paras.push(`Tempat: ${brief.places.map((p) => p.name).join(", ")}.`);
    }
    paras.push(
      "\n[Draf Mock — ganti dengan tulisanmu, atau generate ulang setelah setting API key di menu Settings.]",
    );
    const text = paras.join("\n");
    return { text, tokensUsed: null, provider: "mock", model: null };
  }

  async generateRoadmap(brief: AiBrief): Promise<GenerateResult> {
    const n = Math.max(1, Math.min(100, brief.chapterCount));
    const twistAt = brief.plotTwist?.trim() ? Math.ceil(n / 2) : -1;
    const syn = brief.synopsis.trim().slice(0, 120);
    const chapters: RoadmapChapter[] = Array.from({ length: n }, (_, i) => {
      const num = i + 1;
      let title = `Bab ${num}`;
      let summary = `Bagian ${num} dari cerita: ${syn}...`;
      if (num === 1) {
        title = "Bab 1: Perkenalan";
        summary = `Perkenalan tokoh utama (${brief.mainCharacter.trim().slice(0, 80)}) dan dunia cerita. ${syn}...`;
      } else if (num === n && n > 1) {
        title = `Bab ${num}: Penyelesaian`;
        summary = `Penutup yang mencapai tujuan cerita: ${brief.goals.trim().slice(0, 120)}...`;
      } else if (num === twistAt) {
        title = `Bab ${num}: Plot Twist`;
        summary = `Twist: ${brief.plotTwist!.trim().slice(0, 200)}...`;
      }
      return { chapter_number: num, title, summary, is_plot_twist: num === twistAt };
    });
    return {
      output: {
        chapters,
        placeholder_characters: [
          {
            name: brief.mainCharacter.trim().slice(0, 80) || "Tokoh Utama",
            role: "protagonist",
            personality_traits: "ditentukan penulis",
            physical_description: "ditentukan penulis",
          },
          { name: "Karakter A", role: "antagonist", personality_traits: "ditentukan penulis", physical_description: "ditentukan penulis" },
          { name: "Karakter B", role: "supporting", personality_traits: "ditentukan penulis", physical_description: "ditentukan penulis" },
        ],
        placeholder_places: [
          { name: "Tempat A", type: "", description: "ditentukan penulis" },
          { name: "Tempat B", type: "", description: "ditentukan penulis" },
        ],
      },
      tokensUsed: null,
      provider: "mock",
      model: null,
    };
  }
}

const ROADMAP_SYSTEM = `Kamu generator roadmap novel. Balas HANYA JSON valid (tanpa prosa di luar JSON, tanpa markdown, tanpa gambar) dengan bentuk:
{"chapters":[{"chapter_number":1,"title":"...","summary":"...","is_plot_twist":false}],"placeholder_characters":[{"name":"...","role":"protagonist|antagonist|supporting|minor","personality_traits":"...","physical_description":"..."}],"placeholder_places":[{"name":"...","type":"...","description":"..."}]}
Aturan: tepat N bab sesuai permintaan; selipkan is_plot_twist=true di satu bab yang paling pas (atau tidak sama sekali bila twist tidak cocok); placeholder konsisten dengan roadmap; semua teks Bahasa Indonesia; jangan pernah menyebut gambar/file/attachment.`;

/** Provider OpenAI-compatible (OpenAI, Ollama, LM Studio, dsb. via baseURL). */
export class OpenAiCompatibleProvider implements AiProvider {
  readonly name = "openai_compatible";
  constructor(
    private apiKey: string,
    private baseUrl: string,
    private model: string,
  ) {}

  async generateRoadmap(brief: AiBrief): Promise<GenerateResult> {
    const user = [
      `Sinopsis: ${brief.synopsis}`,
      `Tokoh utama: ${brief.mainCharacter}`,
      `Plot twist: ${brief.plotTwist?.trim() || "(tidak ditentukan — tentukan sendiri bila cocok, atau tanpa twist)"}`,
      `Goals/tujuan cerita: ${brief.goals}`,
      `Jumlah bab: ${brief.chapterCount}`,
    ].join("\n");

    // Gunakan URL persis seperti yang diinput user, pastikan mengarah ke chat/completions jika belum ada
    let cleanBase = this.baseUrl.trim().replace(/\/+$/, "");
    const url = cleanBase.endsWith("/chat/completions") 
      ? cleanBase 
      : `${cleanBase}/chat/completions`;

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: ROADMAP_SYSTEM },
            { role: "user", content: user },
          ],
          response_format: { type: "json_object" },
          temperature: 0.8,
        }),
        signal: AbortSignal.timeout(120000),
      });
    } catch (e) {
      throw new Error(`Tidak bisa menghubungi AI (${e instanceof Error ? e.message : "network error"})`);
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        res.status === 401 || res.status === 403
          ? "API key ditolak provider. Periksa kunci di menu Settings."
          : `Provider AI error (${res.status}): ${text.slice(0, 300)}`,
      );
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { total_tokens?: number };
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("Provider AI mengembalikan respons kosong");
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("Provider AI tidak mengembalikan JSON valid");
    }
    return {
      output: normalizeRoadmap(parsed),
      tokensUsed: data.usage?.total_tokens ?? null,
      provider: "openai_compatible",
      model: this.model,
    };
  }

  async writeChapter(brief: ChapterBrief): Promise<ChapterResult> {
    const ctx = [
      `Novel: ${brief.projectTitle}`,
      `Bab ${brief.chapterNumber}: ${brief.chapterTitle}`,
      `PERHATIAN: Anda hanya boleh mengembalikan TEKS naratif bab. Jangan sebutkan gambar, file, atau hal di luar teks.`,
      `Ringkasan bab ini: ${brief.outlineSummary.trim() || "(kosong)"}`,
      brief.previousSummaries.length > 0
        ? `Ringkasan bab sebelumnya:\n${brief.previousSummaries
            .map((p) => `- Bab ${p.chapterNumber} (${p.title}): ${p.summary || "-"}`)
            .join("\n")}`
        : "Ini bab pertama.",
      brief.characters.length > 0
        ? `Karakter relevan:\n${brief.characters
            .map((c) => `- ${c.name} (${c.role})${c.personalityTraits ? `, sifat: ${c.personalityTraits}` : ""}${c.backstory ? `, latar: ${c.backstory}` : ""}`)
            .join("\n")}`
        : "",
      brief.places.length > 0
        ? `Tempat relevan:\n${brief.places
            .map((p) => `- ${p.name}${p.type ? ` (${p.type})` : ""}${p.description ? `: ${p.description}` : ""}`)
            .join("\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    let cleanBase = this.baseUrl.trim().replace(/\/+$/, "");
    const url = cleanBase.endsWith("/chat/completions") 
      ? cleanBase 
      : `${cleanBase}/chat/completions`;

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: "system",
              content:
                "Kamu penulis novel berbahasa Indonesia. Tulis isi bab berdasarkan konteks yang diberikan. " +
                "Balas HANYA teks naratif bab (boleh markdown), tanpa pembuka/penutup meta. " +
                "Jaga kesinambungan dengan bab sebelumnya dan konsistensi karakter/tempat.",
            },
            { role: "user", content: ctx },
          ],
          temperature: 0.9,
          max_tokens: 3000,
        }),
        signal: AbortSignal.timeout(180000),
      });
    } catch (e) {
      throw new Error(`Tidak bisa menghubungi AI (${e instanceof Error ? e.message : "network error"})`);
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        res.status === 401 || res.status === 403
          ? "API key ditolak provider. Periksa kunci di menu Settings."
          : `Provider AI error (${res.status}): ${text.slice(0, 300)}`,
      );
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { total_tokens?: number };
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("Provider AI mengembalikan respons kosong");
    return {
      text,
      tokensUsed: data.usage?.total_tokens ?? null,
      provider: "openai_compatible",
      model: this.model,
    };
  }
}

export type ProviderSource = "user" | "server" | "mock";

/**
 * Urutan resolusi (Fase 6):
 * 1. Kunci milik user (menu Settings, tersimpan terenkripsi),
 * 2. Kunci server (.env AI_API_KEY) untuk dev lokal/bersama,
 * 3. Mock — selalu bisa jalan tanpa kunci.
 */
export async function resolveRoadmapProvider(
  userId: string,
): Promise<{ provider: AiProvider; source: ProviderSource }> {
  const rows = await db
    .select()
    .from(userAiSettings)
    .where(eq(userAiSettings.userId, userId))
    .limit(1);
  const s = rows[0];
  
  // Jika user memilih provider "mock", langsung pakai Mock
  if (s?.provider === "mock") {
    return { provider: new MockProvider(), source: "mock" };
  }

  if (s?.provider === "openai_compatible" && s.apiKeyEncrypted) {
    const key = await decryptApiKey(s.apiKeyEncrypted);
    return {
      provider: new OpenAiCompatibleProvider(
        key,
        s.baseUrl || "https://elizabeth-waterproof-plant-screenshot.trycloudflare.com",
        s.model || "9router/Combomaut",
      ),
      source: "user",
    };
  }
  const serverKey = process.env.AI_API_KEY?.trim();
  if (serverKey) {
    return {
      provider: new OpenAiCompatibleProvider(
        serverKey,
        process.env.AI_BASE_URL?.trim() || "https://elizabeth-waterproof-plant-screenshot.trycloudflare.com",
        process.env.AI_MODEL?.trim() || "9router/Combomaut",
      ),
      source: "server",
    };
  }
  return { provider: new MockProvider(), source: "mock" };
}

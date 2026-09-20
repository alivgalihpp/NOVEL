import React from "react";
import { Link, useParams } from "react-router-dom";
import {
  api,
  CHAPTER_STATUS_LABEL,
  type Chapter,
  type ChapterStatus,
} from "../lib/api";
import { box, input } from "../components/auth";

const STATUSES = Object.keys(CHAPTER_STATUS_LABEL) as ChapterStatus[];

function liveCount(s: string): number {
  const t = s.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

export function WritePage() {
  const { id: projectId } = useParams<{ id: string }>();
  const [chapters, setChapters] = React.useState<Chapter[]>([]);
  const [selectedId, setSelectedId] = React.useState<string>("");
  const [content, setContent] = React.useState("");
  const [status, setStatus] = React.useState<ChapterStatus>("outline");
  const [savedCount, setSavedCount] = React.useState(0);
  const [dirty, setDirty] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const [msg, setMsg] = React.useState("");

  const selected = chapters.find((c) => c.id === selectedId) ?? null;

  async function load(select?: string) {
    if (!projectId) return;
    const res = await api.listChapters(projectId);
    setChapters(res.chapters);
    const pick = select ?? selectedId ?? res.chapters[0]?.id ?? "";
    setSelectedId(pick);
    const ch = res.chapters.find((c) => c.id === pick);
    if (ch) {
      setContent(ch.content);
      setStatus(ch.status);
      setSavedCount(ch.wordCount);
      setDirty(false);
    }
  }

  React.useEffect(() => {
    load().catch((e) => setMsg(e instanceof Error ? e.message : "Gagal memuat"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  function pick(id: string) {
    if (dirty && !confirm("Ada perubahan belum tersimpan. Pindah bab?")) return;
    const ch = chapters.find((c) => c.id === id);
    if (!ch) return;
    setSelectedId(id);
    setContent(ch.content);
    setStatus(ch.status);
    setSavedCount(ch.wordCount);
    setDirty(false);
    setMsg("");
  }

  async function save() {
    if (!projectId || !selectedId) return;
    try {
      const res = await api.updateChapter(projectId, selectedId, { content, status });
      setChapters(chapters.map((c) => (c.id === selectedId ? res.chapter : c)));
      setSavedCount(res.chapter.wordCount);
      setDirty(false);
      setMsg(`Tersimpan (${res.chapter.wordCount} kata).`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Gagal menyimpan");
    }
  }

  async function generate() {
    if (!projectId || !selectedId || generating) return;
    if (content.trim() && !confirm("Timpa isi saat ini dengan hasil generate AI? (Bisa diedit lagi setelahnya.)")) return;
    setGenerating(true);
    setMsg("");
    try {
      const res = await api.generateChapter(projectId, selectedId);
      setChapters(chapters.map((c) => (c.id === selectedId ? res.chapter : c)));
      setContent(res.chapter.content);
      setStatus(res.chapter.status);
      setSavedCount(res.chapter.wordCount);
      setDirty(false);
      setMsg(`Hasil AI (${res.aiSource}) tersimpan sebagai draf — silakan edit.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Gagal generate");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <main style={{ ...box, maxWidth: 1000 }}>
      <Link to={`/projects/${projectId}`}>← Project</Link>
      <h1>Menulis</h1>
      {msg && <p>{msg}</p>}
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <aside style={{ minWidth: 220, borderRight: "1px solid #ddd", paddingRight: 12 }}>
          <h3>Bab ({chapters.length})</h3>
          <p style={{ fontSize: 12, color: "#666" }}>Sinkron dengan Roadmap.</p>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {chapters.map((c) => (
              <li key={c.id} style={{ marginBottom: 6 }}>
                <button
                  onClick={() => pick(c.id)}
                  style={{ fontWeight: c.id === selectedId ? "bold" : "normal", textAlign: "left" }}
                >
                  Bab {c.chapterNumber}: {c.title}
                </button>
                <div style={{ fontSize: 12, color: "#666" }}>
                  {CHAPTER_STATUS_LABEL[c.status]} · {c.wordCount} kata {c.isPlotTwist && "· TWIST"}
                </div>
              </li>
            ))}
          </ul>
          {chapters.length === 0 && (
            <p>Belum ada bab. Tambahkan dulu di <Link to={`/projects/${projectId}/roadmap`}>Roadmap</Link>.</p>
          )}
        </aside>
        <section style={{ flex: 1 }}>
          {!selected ? (
            <p>Pilih bab di sebelah kiri.</p>
          ) : (
            <>
              <h2>Bab {selected.chapterNumber}: {selected.title}</h2>
              {selected.outlineSummary && (
                <p style={{ background: "#f6f6f6", padding: 8, fontSize: 14 }}>
                  <strong>Ringkasan:</strong> {selected.outlineSummary}
                </p>
              )}
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                <select value={status} onChange={(e) => { setStatus(e.target.value as ChapterStatus); setDirty(true); }}>
                  {STATUSES.map((s) => (<option key={s} value={s}>{CHAPTER_STATUS_LABEL[s]}</option>))}
                </select>
                <button onClick={save} disabled={generating}>Simpan</button>
                <button onClick={generate} disabled={generating}>
                  {generating ? "Generate... (bisa ~1 menit)" : "Generate dengan AI"}
                </button>
                <span style={{ fontSize: 13, color: "#666" }}>
                  {liveCount(content)} kata (draf){dirty ? " · belum tersimpan" : ` · tersimpan: ${savedCount} kata`}
                </span>
              </div>
              <textarea
                style={{ ...input, minHeight: 420, fontFamily: "Georgia, serif", fontSize: 16, lineHeight: 1.7 }}
                placeholder="Tulis isi bab di sini (markdown/teks biasa)..."
                value={content}
                onChange={(e) => { setContent(e.target.value); setDirty(true); }}
              />
            </>
          )}
        </section>
      </div>
    </main>
  );
}

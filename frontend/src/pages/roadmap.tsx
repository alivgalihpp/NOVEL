import React from "react";
import { Link, useParams } from "react-router-dom";
import {
  api,
  CHAPTER_STATUS_LABEL,
  type Chapter,
  type ChapterStatus,
  type RoadmapEdge,
} from "../lib/api";
import { box, input } from "../components/auth";

const STATUSES = Object.keys(CHAPTER_STATUS_LABEL) as ChapterStatus[];

export function RoadmapPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const [chapters, setChapters] = React.useState<Chapter[]>([]);
  const [edges, setEdges] = React.useState<RoadmapEdge[]>([]);
  const [title, setTitle] = React.useState("");
  const [summary, setSummary] = React.useState("");
  const [edgeFrom, setEdgeFrom] = React.useState("");
  const [edgeTo, setEdgeTo] = React.useState("");
  const [edgeLabel, setEdgeLabel] = React.useState("");
  const [editing, setEditing] = React.useState<Record<string, { title: string; summary: string }>>({});
  const [err, setErr] = React.useState("");

  async function load() {
    if (!projectId) return;
    try {
      const [c, e] = await Promise.all([
        api.listChapters(projectId),
        api.listEdges(projectId),
      ]);
      setChapters(c.chapters);
      setEdges(e.edges);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal memuat roadmap");
    }
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId || !title.trim()) return;
    try {
      await api.createChapter(projectId, {
        title: title.trim(),
        outlineSummary: summary.trim() || undefined,
      });
      setTitle("");
      setSummary("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menambah bab");
    }
  }

  async function patch(chapterId: string, body: Partial<Chapter>) {
    if (!projectId) return;
    try {
      await api.updateChapter(projectId, chapterId, body);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menyimpan");
    }
  }

  async function remove(chapterId: string) {
    if (!projectId || !confirm("Hapus bab ini beserta koneksinya?")) return;
    try {
      await api.deleteChapter(projectId, chapterId);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menghapus");
    }
  }

  async function addEdge(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId || !edgeFrom || !edgeTo) return;
    try {
      await api.createEdge(projectId, {
        sourceChapterId: edgeFrom,
        targetChapterId: edgeTo,
        label: edgeLabel.trim() || undefined,
      });
      setEdgeFrom("");
      setEdgeTo("");
      setEdgeLabel("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menambah koneksi");
    }
  }

  async function delEdge(edgeId: string) {
    if (!projectId || !confirm("Putus koneksi ini?")) return;
    await api.deleteEdge(projectId, edgeId);
    await load();
  }

  const byId = new Map(chapters.map((c) => [c.id, c]));
  const outgoing = new Map<string, RoadmapEdge[]>();
  for (const e of edges) {
    const list = outgoing.get(e.sourceChapterId) ?? [];
    list.push(e);
    outgoing.set(e.sourceChapterId, list);
  }

  function startEdit(c: Chapter) {
    setEditing({ ...editing, [c.id]: { title: c.title, summary: c.outlineSummary } });
  }

  async function saveEdit(c: Chapter) {
    const f = editing[c.id];
    if (!f) return;
    await patch(c.id, { title: f.title.trim(), outlineSummary: f.summary.trim() });
    const next = { ...editing };
    delete next[c.id];
    setEditing(next);
  }

  return (
    <main style={{ ...box, maxWidth: 860 }}>
      <Link to={`/projects/${projectId}`}>← Project</Link>
      <h1>Roadmap — Alur Cerita ({chapters.length} bab)</h1>
      <p style={{ fontSize: 14, color: "#666" }}>
        Versi list (Fase 3). Diagram visual + Family Tree hadir di Fase 4.
      </p>
      {err && <p style={{ color: "crimson" }}>{err}</p>}

      <h2>Tambah bab</h2>
      <form onSubmit={create}>
        <input style={input} placeholder="Judul bab" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea style={{ ...input, minHeight: 60 }} placeholder="Ringkasan bab (outline)" value={summary} onChange={(e) => setSummary(e.target.value)} />
        <button type="submit">Tambah (nomor otomatis)</button>
      </form>

      <h2>Daftar bab</h2>
      {chapters.length === 0 && <p>Belum ada bab.</p>}
      <ol>
        {chapters.map((c) => {
          const outs = outgoing.get(c.id) ?? [];
          const f = editing[c.id];
          return (
            <li key={c.id} style={{ marginBottom: 16, border: c.isPlotTwist ? "2px solid #b00" : "1px solid #ddd", padding: 12 }}>
              {f ? (
                <>
                  <input style={input} value={f.title} onChange={(e) => setEditing({ ...editing, [c.id]: { ...f, title: e.target.value } })} />
                  <textarea style={{ ...input, minHeight: 60 }} value={f.summary} onChange={(e) => setEditing({ ...editing, [c.id]: { ...f, summary: e.target.value } })} />
                  <button onClick={() => saveEdit(c)}>Simpan</button>{" "}
                  <button onClick={() => { const n = { ...editing }; delete n[c.id]; setEditing(n); }}>Batal</button>
                </>
              ) : (
                <>
                  <strong>Bab {c.chapterNumber}: {c.title}</strong>{" "}
                  {c.isPlotTwist && <span style={{ background: "#b00", color: "#fff", padding: "2px 8px", fontSize: 12 }}>PLOT TWIST</span>}
                  <p style={{ margin: "6px 0" }}>{c.outlineSummary || <em>(belum ada ringkasan)</em>}</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <select value={c.status} onChange={(e) => patch(c.id, { status: e.target.value as ChapterStatus })}>
                      {STATUSES.map((s) => (<option key={s} value={s}>{CHAPTER_STATUS_LABEL[s]}</option>))}
                    </select>
                    <button onClick={() => patch(c.id, { isPlotTwist: !c.isPlotTwist })}>
                      {c.isPlotTwist ? "Hapus tanda twist" : "Tandai plot twist"}
                    </button>
                    <button onClick={() => startEdit(c)}>Edit</button>
                    <button onClick={() => remove(c.id)}>Hapus</button>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 14 }}>
                    → Lanjut ke:{" "}
                    {outs.length === 0 ? <em>(tidak ada — bab akhir / belum disambung)</em> : outs.map((e) => (
                      <span key={e.id} style={{ marginRight: 8 }}>
                        Bab {byId.get(e.targetChapterId)?.chapterNumber ?? "?"}
                        {e.label ? ` (${e.label})` : ""}{" "}
                        <button onClick={() => delEdge(e.id)}>putus</button>
                      </span>
                    ))}
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ol>

      {chapters.length >= 2 && (
        <>
          <h2>Sambung bab (koneksi alur)</h2>
          <form onSubmit={addEdge} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <select value={edgeFrom} onChange={(e) => setEdgeFrom(e.target.value)}>
              <option value="">— dari —</option>
              {chapters.map((c) => (<option key={c.id} value={c.id}>Bab {c.chapterNumber}: {c.title}</option>))}
            </select>
            <select value={edgeTo} onChange={(e) => setEdgeTo(e.target.value)}>
              <option value="">— ke —</option>
              {chapters.map((c) => (<option key={c.id} value={c.id}>Bab {c.chapterNumber}: {c.title}</option>))}
            </select>
            <input placeholder='Label mis. "flashback" (opsional)' value={edgeLabel} onChange={(e) => setEdgeLabel(e.target.value)} />
            <button type="submit">Sambung</button>
          </form>
        </>
      )}
    </main>
  );
}

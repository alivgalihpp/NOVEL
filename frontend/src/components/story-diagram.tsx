import React from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type OnNodeDrag,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  api,
  CHAPTER_STATUS_LABEL,
  type Chapter,
  type ChapterStatus,
} from "../lib/api";
import { input } from "./auth";

type ChapterNodeData = {
  chapterNumber: number;
  title: string;
  status: ChapterStatus;
  isPlotTwist: boolean;
} & Record<string, unknown>;

const STATUS_BG: Record<ChapterStatus, string> = {
  outline: "#ffffff",
  draft: "#fffbeb",
  final: "#ecfdf5",
};

function ChapterNode({ data }: { data: ChapterNodeData }) {
  return (
    <div
      style={{
        border: data.isPlotTwist ? "3px solid #b00" : "2px solid #333",
        borderRadius: 8,
        background: STATUS_BG[data.status],
        padding: "8px 12px",
        minWidth: 170,
        maxWidth: 230,
      }}
    >
      <div style={{ fontSize: 12, color: "#666" }}>Bab {data.chapterNumber} · {CHAPTER_STATUS_LABEL[data.status]}</div>
      <div style={{ fontWeight: "bold" }}>{data.title}</div>
      {data.isPlotTwist && (
        <div style={{ fontSize: 11, background: "#b00", color: "#fff", display: "inline-block", padding: "1px 6px", marginTop: 4 }}>
          PLOT TWIST
        </div>
      )}
    </div>
  );
}

const nodeTypes = { chapter: ChapterNode };

function toNodes(chapters: Chapter[]): Node[] {
  return chapters.map((c, i) => ({
    id: c.id,
    type: "chapter",
    position: {
      x: c.roadmapPosX ?? 60 + (i % 2) * 300,
      y: c.roadmapPosY ?? Math.floor(i / 2) * 170 + 20,
    },
    data: {
      chapterNumber: c.chapterNumber,
      title: c.title,
      status: c.status,
      isPlotTwist: c.isPlotTwist,
    },
  }));
}

function toEdges(chapters: { id: string }[], edges: { id: string; sourceChapterId: string; targetChapterId: string; label: string | null }[]): Edge[] {
  const ids = new Set(chapters.map((c) => c.id));
  return edges
    .filter((e) => ids.has(e.sourceChapterId) && ids.has(e.targetChapterId))
    .map((e) => ({
      id: e.id,
      source: e.sourceChapterId,
      target: e.targetChapterId,
      label: e.label ?? undefined,
      animated: true,
    }));
}

export function StoryDiagram({ projectId }: { projectId: string }) {
  const [nodes, setNodes] = React.useState<Node[]>([]);
  const [edges, setEdges] = React.useState<Edge[]>([]);
  const [chapters, setChapters] = React.useState<Chapter[]>([]);
  const [selected, setSelected] = React.useState<Chapter | null>(null);
  const [form, setForm] = React.useState({ title: "", summary: "", status: "outline" as ChapterStatus, isPlotTwist: false });
  const [newTitle, setNewTitle] = React.useState("");
  const [err, setErr] = React.useState("");

  const load = React.useCallback(async () => {
    try {
      const [c, e] = await Promise.all([
        api.listChapters(projectId),
        api.listEdges(projectId),
      ]);
      setChapters(c.chapters);
      setNodes((prev) => {
        // Pertahankan posisi drag lokal yang belum tersimpan
        const pos = new Map(prev.map((n) => [n.id, n.position]));
        return toNodes(c.chapters).map((n) => {
          const p = pos.get(n.id);
          return p ? { ...n, position: p } : n;
        });
      });
      setEdges(toEdges(c.chapters, e.edges));
      setSelected((sel) => c.chapters.find((x) => x.id === sel?.id) ?? null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal memuat diagram");
    }
  }, [projectId]);

  React.useEffect(() => {
    load();
  }, [load]);

  function onNodesChange(changes: NodeChange[]) {
    setNodes((ns) => applyNodeChanges(changes, ns));
  }

  function onEdgesChange(changes: EdgeChange[]) {
    setEdges((es) => applyEdgeChanges(changes, es));
  }

  const onNodeDragStop: OnNodeDrag = async (_, node) => {
    try {
      await api.updateChapter(projectId, node.id, {
        roadmapPosX: Math.round(node.position.x),
        roadmapPosY: Math.round(node.position.y),
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menyimpan posisi");
    }
  }

  async function onConnect(conn: Connection) {
    if (!conn.source || !conn.target) return;
    if (conn.source === conn.target) {
      setErr("Bab tidak bisa tersambung ke dirinya sendiri");
      return;
    }
    try {
      const res = await api.createEdge(projectId, {
        sourceChapterId: conn.source,
        targetChapterId: conn.target,
      });
      setEdges((es) => [
        ...es,
        { id: res.edge.id, source: conn.source!, target: conn.target!, animated: true },
      ]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menyambung");
      load();
    }
  }

  async function onDelete(params: { nodes: Node[]; edges: Edge[] }) {
    for (const e of params.edges) {
      try {
        await api.deleteEdge(projectId, e.id);
      } catch (err) {
        setErr(err instanceof Error ? err.message : "Gagal memutus koneksi");
      }
    }
    for (const n of params.nodes) {
      try {
        await api.deleteChapter(projectId, n.id);
      } catch (err) {
        setErr(err instanceof Error ? err.message : "Gagal menghapus bab");
      }
    }
    load();
  }

  function pick(id: string) {
    const c = chapters.find((x) => x.id === id) ?? null;
    setSelected(c);
    if (c) setForm({ title: c.title, summary: c.outlineSummary, status: c.status, isPlotTwist: c.isPlotTwist });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    try {
      await api.updateChapter(projectId, selected.id, {
        title: form.title.trim(),
        outlineSummary: form.summary.trim(),
        status: form.status,
        isPlotTwist: form.isPlotTwist,
      });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menyimpan");
    }
  }

  async function addChapter(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const maxY = nodes.reduce((m, n) => Math.max(m, n.position.y), 0);
      const res = await api.createChapter(projectId, { title: newTitle.trim() });
      await api.updateChapter(projectId, res.chapter.id, {
        roadmapPosX: 60,
        roadmapPosY: maxY + 170,
      });
      setNewTitle("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menambah bab");
    }
  }

  return (
    <div>
      {err && <p style={{ color: "crimson" }}>{err}</p>}
      <form onSubmit={addChapter} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input style={{ ...input, margin: 0, maxWidth: 320 }} placeholder="Judul bab baru" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
        <button type="submit">Tambah node</button>
      </form>
      <p style={{ fontSize: 13, color: "#666" }}>
        Geser node untuk mengatur posisi (tersimpan otomatis). Tarik garis antar node untuk menyambung.
        Pilih garis + tekan <kbd>Backspace</kbd> untuk memutus. Klik node untuk mengedit.
      </p>
      <div style={{ height: 520, border: "1px solid #ccc", borderRadius: 8 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStop={onNodeDragStop}
          onConnect={onConnect}
          onDelete={onDelete}
          onNodeClick={(_, n) => pick(n.id)}
          onPaneClick={() => setSelected(null)}
          deleteKeyCode={["Backspace", "Delete"]}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
      {selected && (
        <form onSubmit={save} style={{ marginTop: 12, border: "1px solid #ddd", padding: 12, borderRadius: 8 }}>
          <h3>Edit: Bab {selected.chapterNumber}</h3>
          <label>Judul</label>
          <input style={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <label>Ringkasan</label>
          <textarea style={{ ...input, minHeight: 60 }} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ChapterStatus })}>
              {(Object.keys(CHAPTER_STATUS_LABEL) as ChapterStatus[]).map((s) => (
                <option key={s} value={s}>{CHAPTER_STATUS_LABEL[s]}</option>
              ))}
            </select>
            <label>
              <input type="checkbox" checked={form.isPlotTwist} onChange={(e) => setForm({ ...form, isPlotTwist: e.target.checked })} /> Plot twist
            </label>
            <button type="submit">Simpan</button>
            <button type="button" onClick={() => setSelected(null)}>Tutup</button>
          </div>
        </form>
      )}
    </div>
  );
}

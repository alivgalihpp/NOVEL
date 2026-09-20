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
import { api, CHAPTER_STATUS_LABEL, type Chapter, type ChapterStatus } from "../lib/api";
import { Button, Err, Field, Icon, Input, Select, Textarea } from "./ui";

type ChapterNodeData = {
  chapterNumber: number;
  title: string;
  status: ChapterStatus;
  isPlotTwist: boolean;
} & Record<string, unknown>;

const STATUS_BG: Record<ChapterStatus, string> = {
  outline: "#fffdf7",
  draft: "#faf3df",
  final: "#edf2e3",
};

function ChapterNode({ data }: { data: ChapterNodeData }) {
  return (
    <div
      style={{
        border: data.isPlotTwist ? "2.5px solid #8c1d18" : "1.5px solid #1c1712",
        borderRadius: 6,
        background: STATUS_BG[data.status],
        padding: "10px 14px",
        minWidth: 180,
        maxWidth: 240,
        fontFamily: "'Space Grotesk', system-ui, sans-serif",
      }}
    >
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.16em", color: "#8d8471" }}>
        BAB {data.chapterNumber} · {CHAPTER_STATUS_LABEL[data.status].toUpperCase()}
      </div>
      <div style={{ fontFamily: "Fraunces, Georgia, serif", fontWeight: 600, fontSize: 17, lineHeight: 1.25 }}>
        {data.title}
      </div>
      {data.isPlotTwist && (
        <div style={{ marginTop: 4, display: "inline-block", background: "#8c1d18", color: "#fff4ee", fontSize: 10, letterSpacing: "0.14em", padding: "2px 7px" }}>
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
      x: c.roadmapPosX ?? 60 + (i % 2) * 320,
      y: c.roadmapPosY ?? Math.floor(i / 2) * 180 + 20,
    },
    data: {
      chapterNumber: c.chapterNumber,
      title: c.title,
      status: c.status,
      isPlotTwist: c.isPlotTwist,
    },
  }));
}

function toEdges(
  chapters: { id: string }[],
  edges: { id: string; sourceChapterId: string; targetChapterId: string; label: string | null }[],
): Edge[] {
  const ids = new Set(chapters.map((c) => c.id));
  return edges
    .filter((e) => ids.has(e.sourceChapterId) && ids.has(e.targetChapterId))
    .map((e) => ({
      id: e.id,
      source: e.sourceChapterId,
      target: e.targetChapterId,
      label: e.label ?? undefined,
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
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const [c, e] = await Promise.all([api.listChapters(projectId), api.listEdges(projectId)]);
      setChapters(c.chapters);
      setNodes((prev) => {
        const pos = new Map(prev.map((n) => [n.id, n.position]));
        return toNodes(c.chapters).map((n) => {
          const p = pos.get(n.id);
          return p ? { ...n, position: p } : n;
        });
      });
      setEdges(toEdges(c.chapters, e.edges));
      setSelected((sel) => c.chapters.find((x) => x.id === sel?.id) ?? null);
      setErr("");
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
  };

  async function onConnect(conn: Connection) {
    if (!conn.source || !conn.target) return;
    if (conn.source === conn.target) {
      setErr("Bab tidak bisa tersambung ke dirinya sendiri");
      return;
    }
    try {
      const res = await api.createEdge(projectId, { sourceChapterId: conn.source, targetChapterId: conn.target });
      setEdges((es) => [...es, { id: res.edge.id, source: conn.source!, target: conn.target! }]);
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
    setSaving(true);
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
    } finally {
      setSaving(false);
    }
  }

  async function addChapter(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const maxY = nodes.reduce((m, n) => Math.max(m, n.position.y), 0);
      const res = await api.createChapter(projectId, { title: newTitle.trim() });
      await api.updateChapter(projectId, res.chapter.id, { roadmapPosX: 60, roadmapPosY: maxY + 180 });
      setNewTitle("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menambah bab");
    }
  }

  return (
    <div className="p-4">
      <Err message={err} />
      <form onSubmit={addChapter} className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <Input placeholder="Judul bab baru…" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="w-64" />
          <Button type="submit" variant="ink"><Icon name="plus" /> Node</Button>
        </div>
        <p className="max-w-md text-xs leading-relaxed text-muted">
          Geser kartu untuk menata (tersimpan otomatis). Tarik garis antar kartu untuk menyambung alur.
          Klik garis + <kbd className="rounded border border-line bg-paper px-1 font-mono">Backspace</kbd> untuk memutus. Klik kartu untuk menyunting.
        </p>
      </form>

      <div className="xy-theme-novel h-[520px] overflow-hidden rounded-md border border-line">
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
          <Background color="#d8cdae" gap={24} size={1} />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>

      {selected && (
        <form onSubmit={save} className="mt-3 rounded-md border border-line bg-paper p-4">
          <div className="flex items-center justify-between border-b border-line-soft pb-2">
            <h3 className="font-display text-lg font-semibold">Sunting — Bab {selected.chapterNumber}</h3>
            <button type="button" onClick={() => setSelected(null)} className="rounded p-1 text-muted hover:text-ink" title="Tutup">
              <Icon name="x" />
            </button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Judul">
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ChapterStatus })}>
                <option value="outline">Outline</option>
                <option value="draft">Draft</option>
                <option value="final">Final</option>
              </Select>
            </Field>
          </div>
          <div className="mt-3">
            <Field label="Ringkasan">
              <Textarea rows={2} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-soft">
              <input type="checkbox" checked={form.isPlotTwist} onChange={(e) => setForm({ ...form, isPlotTwist: e.target.checked })} className="accent-[#8c1d18]" />
              Tandai plot twist
            </label>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setSelected(null)}>Tutup</Button>
              <Button type="submit" variant="primary" disabled={saving}>{saving ? "Menyimpan…" : "Simpan"}</Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

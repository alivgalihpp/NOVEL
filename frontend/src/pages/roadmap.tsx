import React from "react";
import { useParams } from "react-router-dom";
import {
  api,
  CHAPTER_STATUS_LABEL,
  type Chapter,
  type ChapterStatus,
  type RoadmapEdge,
} from "../lib/api";
import { Badge, Button, Card, Empty, Err, Field, Icon, Input, ProjectShell, Select, Textarea } from "../components/ui";
import { StoryDiagram } from "../components/story-diagram";
import { FamilyTree } from "../components/family-tree";

const STATUSES = Object.keys(CHAPTER_STATUS_LABEL) as ChapterStatus[];

const STATUS_TONE: Record<ChapterStatus, "line" | "gold" | "moss"> = {
  outline: "line",
  draft: "gold",
  final: "moss",
};

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
  const [tab, setTab] = React.useState<"diagram" | "list" | "family">("diagram");
  const [err, setErr] = React.useState("");

  async function load() {
    if (!projectId) return;
    try {
      const [c, e] = await Promise.all([api.listChapters(projectId), api.listEdges(projectId)]);
      setChapters(c.chapters);
      setEdges(e.edges);
      setErr("");
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
      await api.createChapter(projectId, { title: title.trim(), outlineSummary: summary.trim() || undefined });
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

  async function remove(chapterId: string, name: string) {
    if (!projectId || !confirm(`Hapus "${name}" beserta koneksinya?`)) return;
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

  const twists = chapters.filter((c) => c.isPlotTwist).length;

  return (
    <ProjectShell
      title="Peta alur"
      meta={
        <>
          <Badge>{chapters.length} bab</Badge>
          <Badge>{edges.length} sambungan</Badge>
          {twists > 0 && <Badge tone="oxblood">{twists} twist</Badge>}
        </>
      }
    >
      <div className="flex gap-1 rounded-lg border border-line bg-card p-1">
        {(["diagram", "list", "family"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === t ? "bg-ink text-paper" : "text-ink-soft hover:bg-paper-deep"
            }`}
          >
            {t === "diagram" ? "Diagram" : t === "list" ? "Daftar" : "Silsilah"}
          </button>
        ))}
      </div>
      <div className="mt-4">
        <Err message={err} />
      </div>

      {tab === "diagram" && projectId && (
        <Card className="overflow-hidden">
          <StoryDiagram projectId={projectId} />
        </Card>
      )}
      {tab === "family" && projectId && (
        <Card className="overflow-hidden">
          <FamilyTree projectId={projectId} />
        </Card>
      )}

      {tab === "list" && (
        <>
          <Card className="p-4">
            <form onSubmit={create} className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="flex-1">
                <Field label="Judul bab baru">
                  <Input placeholder="cth. Badai di Pelabuhan" value={title} onChange={(e) => setTitle(e.target.value)} />
                </Field>
              </div>
              <div className="flex-1">
                <Field label="Ringkasan (outline)">
                  <Input placeholder="Satu kalimat intisari…" value={summary} onChange={(e) => setSummary(e.target.value)} />
                </Field>
              </div>
              <Button variant="ink" type="submit"><Icon name="plus" /> Nomor otomatis</Button>
            </form>
          </Card>

          {chapters.length === 0 ? (
            <div className="mt-4"><Empty title="Peta masih kosong." hint="Tambahkan bab pertama lewat formulir di atas." /></div>
          ) : (
            <ol className="mt-4 space-y-3">
              {chapters.map((c) => {
                const outs = outgoing.get(c.id) ?? [];
                const f = editing[c.id];
                return (
                  <li key={c.id} className={`rounded-lg border bg-card p-4 ${c.isPlotTwist ? "border-oxblood" : "border-line"}`}>
                    {f ? (
                      <div className="space-y-2">
                        <Input value={f.title} onChange={(e) => setEditing({ ...editing, [c.id]: { ...f, title: e.target.value } })} />
                        <Textarea rows={2} value={f.summary} onChange={(e) => setEditing({ ...editing, [c.id]: { ...f, summary: e.target.value } })} />
                        <div className="flex gap-2">
                          <Button variant="ink" onClick={() => saveEdit(c)}>Simpan</Button>
                          <Button variant="ghost" onClick={() => { const n = { ...editing }; delete n[c.id]; setEditing(n); }}>Batal</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-baseline gap-3">
                            <span className="font-display text-3xl text-line italic select-none">
                              {String(c.chapterNumber).padStart(2, "0")}
                            </span>
                            <div className="min-w-0">
                              <h3 className="font-display truncate text-xl font-semibold">{c.title}</h3>
                              <div className="mt-1 flex flex-wrap gap-1.5">
                                <Badge tone={STATUS_TONE[c.status]}>{CHAPTER_STATUS_LABEL[c.status]}</Badge>
                                {c.isPlotTwist && <Badge tone="oxblood">plot twist</Badge>}
                                <Badge>{c.wordCount} kata</Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <Select value={c.status} onChange={(e) => patch(c.id, { status: e.target.value as ChapterStatus })} className="w-auto py-1 text-xs">
                              {STATUSES.map((s) => (<option key={s} value={s}>{CHAPTER_STATUS_LABEL[s]}</option>))}
                            </Select>
                          </div>
                        </div>
                        <p className="mt-2 text-sm text-ink-soft">{c.outlineSummary || <em className="text-muted">Belum ada ringkasan.</em>}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                          <span className="kicker">lanjut ke</span>
                          {outs.length === 0 ? (
                            <em className="text-xs text-muted">ujung jalan — sambungkan di bawah</em>
                          ) : (
                            outs.map((e) => (
                              <span key={e.id} className="inline-flex items-center gap-1 rounded-sm bg-paper-deep px-2 py-0.5 font-mono text-xs">
                                → Bab {byId.get(e.targetChapterId)?.chapterNumber ?? "?"}
                                {e.label ? ` · ${e.label}` : ""}
                                <button onClick={() => delEdge(e.id)} className="text-muted hover:text-oxblood" title="Putus">
                                  <Icon name="x" className="h-3 w-3" />
                                </button>
                              </span>
                            ))
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button variant="ghost" onClick={() => patch(c.id, { isPlotTwist: !c.isPlotTwist })}>
                            {c.isPlotTwist ? "Lepas tanda twist" : "Tandai twist"}
                          </Button>
                          <Button variant="ghost" onClick={() => startEdit(c)}>Ubah</Button>
                          <Button variant="ghost" onClick={() => remove(c.id, c.title)}>
                            <span className="text-oxblood">Hapus</span>
                          </Button>
                        </div>
                      </>
                    )}
                  </li>
                );
              })}
            </ol>
          )}

          {chapters.length >= 2 && (
            <Card className="mt-4 p-4">
              <p className="kicker">sambung bab</p>
              <form onSubmit={addEdge} className="mt-2 flex flex-col gap-2 md:flex-row">
                <Select value={edgeFrom} onChange={(e) => setEdgeFrom(e.target.value)} className="flex-1">
                  <option value="">— dari —</option>
                  {chapters.map((c) => (<option key={c.id} value={c.id}>Bab {c.chapterNumber}: {c.title}</option>))}
                </Select>
                <Select value={edgeTo} onChange={(e) => setEdgeTo(e.target.value)} className="flex-1">
                  <option value="">— ke —</option>
                  {chapters.map((c) => (<option key={c.id} value={c.id}>Bab {c.chapterNumber}: {c.title}</option>))}
                </Select>
                <Input placeholder='Label, mis. "flashback"' value={edgeLabel} onChange={(e) => setEdgeLabel(e.target.value)} className="flex-1" />
                <Button type="submit" variant="line">Sambung</Button>
              </form>
            </Card>
          )}
        </>
      )}
    </ProjectShell>
  );
}

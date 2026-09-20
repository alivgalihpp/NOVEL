import React from "react";
import { Link, useParams } from "react-router-dom";
import { api, CHAPTER_STATUS_LABEL, type Chapter, type ChapterStatus } from "../lib/api";
import { Badge, Button, Empty, Icon, ProjectShell, Select } from "../components/ui";

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
  const [err, setErr] = React.useState("");

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
    load().catch((e) => setErr(e instanceof Error ? e.message : "Gagal memuat"));
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
    setErr("");
  }

  async function save() {
    if (!projectId || !selectedId) return;
    try {
      const res = await api.updateChapter(projectId, selectedId, { content, status });
      setChapters(chapters.map((c) => (c.id === selectedId ? res.chapter : c)));
      setSavedCount(res.chapter.wordCount);
      setDirty(false);
      setMsg(`Tersimpan — ${res.chapter.wordCount.toLocaleString("id-ID")} kata.`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menyimpan");
    }
  }

  async function generate() {
    if (!projectId || !selectedId || generating) return;
    if (content.trim() && !confirm("Timpa isi saat ini dengan hasil generate AI? (Bisa diedit lagi setelahnya.)")) return;
    setGenerating(true);
    setMsg("");
    setErr("");
    try {
      const res = await api.generateChapter(projectId, selectedId);
      setChapters(chapters.map((c) => (c.id === selectedId ? res.chapter : c)));
      setContent(res.chapter.content);
      setStatus(res.chapter.status);
      setSavedCount(res.chapter.wordCount);
      setDirty(false);
      setMsg(`Draf ${res.aiSource} tersimpan — silakan sunting dengan gayamu.`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal generate");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <ProjectShell
      title="Ruang menulis"
      meta={selected ? <><Badge>{selected.wordCount.toLocaleString("id-ID")} kata</Badge><Badge tone={selected.status === "final" ? "moss" : selected.status === "draft" ? "gold" : "line"}>{CHAPTER_STATUS_LABEL[selected.status]}</Badge></> : undefined}
    >
      {err && <p className="mb-3 rounded-md border border-oxblood/40 bg-oxblood/5 px-3 py-2 text-sm text-oxblood">{err}</p>}
      {msg && <p className="mb-3 rounded-md border border-moss/40 bg-moss/5 px-3 py-2 text-sm text-moss">{msg}</p>}

      <div className="flex flex-col gap-4 lg:flex-row">
        <aside className="shrink-0 lg:w-64">
          <p className="kicker">bab · sinkron roadmap</p>
          {chapters.length === 0 ? (
            <div className="mt-2">
              <Empty title="Belum ada bab." hint="Susun dulu kerangkanya di Roadmap.">
                <Link to="roadmap"><Button variant="line">Ke Roadmap</Button></Link>
              </Empty>
            </div>
          ) : (
            <ol className="mt-2 divide-y divide-line-soft rounded-lg border border-line bg-card">
              {chapters.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => pick(c.id)}
                    className={`block w-full px-4 py-3 text-left transition-colors ${
                      c.id === selectedId ? "bg-ink text-paper" : "hover:bg-paper-deep"
                    }`}
                  >
                    <span className={`block font-display text-lg leading-snug font-semibold ${c.id === selectedId ? "" : ""}`}>
                      <span className={`mr-2 font-mono text-xs ${c.id === selectedId ? "text-paper/60" : "text-muted"}`}>
                        {String(c.chapterNumber).padStart(2, "0")}
                      </span>
                      {c.title}
                    </span>
                    <span className={`mt-0.5 block font-mono text-[11px] ${c.id === selectedId ? "text-paper/60" : "text-muted"}`}>
                      {CHAPTER_STATUS_LABEL[c.status]} · {c.wordCount} kt{c.isPlotTwist ? " · TWIST" : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </aside>

        <section className="min-w-0 flex-1 rounded-lg border border-line bg-card">
          {!selected ? (
            <p className="p-8 text-center font-display text-xl text-muted italic">Pilih bab di sebelah kiri untuk mulai menulis.</p>
          ) : (
            <div className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line-soft pb-3">
                <div>
                  <p className="kicker">bab {selected.chapterNumber}{selected.isPlotTwist ? " · plot twist" : ""}</p>
                  <h2 className="font-display text-3xl font-semibold">{selected.title}</h2>
                  {selected.outlineSummary && (
                    <p className="mt-1 max-w-2xl border-l-2 border-ember/60 pl-3 text-sm text-ink-soft italic">
                      {selected.outlineSummary}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 py-3">
                <Select value={status} onChange={(e) => { setStatus(e.target.value as ChapterStatus); setDirty(true); }} className="w-auto">
                  {STATUSES.map((s) => (<option key={s} value={s}>{CHAPTER_STATUS_LABEL[s]}</option>))}
                </Select>
                <Button onClick={save} variant="ink" disabled={generating}>
                  <Icon name="check" /> Simpan
                </Button>
                <Button onClick={generate} variant="primary" disabled={generating}>
                  <Icon name="spark" /> {generating ? "Menulis draf…" : "Generate dengan AI"}
                </Button>
                <span className="font-mono text-xs text-muted">
                  {liveCount(content).toLocaleString("id-ID")} kata{dirty ? " · belum tersimpan" : ` · arsip: ${savedCount.toLocaleString("id-ID")}`}
                </span>
              </div>

              <textarea
                value={content}
                onChange={(e) => { setContent(e.target.value); setDirty(true); }}
                placeholder="Mulai dari kalimat pertama yang jujur…"
                spellCheck={false}
                className="min-h-[480px] w-full resize-y rounded-md border border-line bg-[#fffefa] p-5 font-display text-[17px] leading-[1.85] text-ink placeholder:text-muted/70 focus:border-ember focus:outline-none"
              />
            </div>
          )}
        </section>
      </div>
    </ProjectShell>
  );
}

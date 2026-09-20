import React from "react";
import { Link, useParams } from "react-router-dom";
import { api, type Chapter, type Project } from "../lib/api";
import { Badge, Button, Err, Icon, Ok, ProjectShell } from "../components/ui";

function Para({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n{2,}|\n/).map((p, i) =>
        p.trim() ? <p key={i}>{p.trim()}</p> : null,
      )}
    </>
  );
}

export function PreviewPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const [project, setProject] = React.useState<Project | null>(null);
  const [chapters, setChapters] = React.useState<Chapter[]>([]);
  const [msg, setMsg] = React.useState("");
  const [err, setErr] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function load() {
    if (!projectId) return;
    try {
      const [p, c] = await Promise.all([api.getProject(projectId), api.listChapters(projectId)]);
      setProject(p.project);
      setChapters(c.chapters);
      setErr("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal memuat");
    }
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!projectId || !file) return;
    setBusy(true);
    try {
      const res = await api.uploadCover(projectId, file);
      setProject(res.project);
      setMsg("Sampul terpasang.");
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload gagal");
    } finally {
      setBusy(false);
    }
  }

  async function removeCover() {
    if (!projectId || !confirm("Lepas sampul (kembali polos)?")) return;
    await api.deleteCover(projectId);
    load();
  }

  if (!project)
    return (
      <ProjectShell title="…">
        <Err message={err} />
        <p>Memuat…</p>
      </ProjectShell>
    );

  const cover = api.coverSrc(project.coverImageUrl);
  const totalWords = chapters.reduce((n, c) => n + c.wordCount, 0);

  return (
    <ProjectShell
      title="Cetakan percobaan"
      meta={<><Badge>{chapters.length} bab</Badge><Badge>{totalWords.toLocaleString("id-ID")} kata</Badge></>}
    >
      <Err message={err} />
      <Ok message={msg} />

      <form onSubmit={upload} className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-line bg-card p-3">
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="text-sm" />
        <Button type="submit" variant="line" disabled={busy}>{busy ? "Memasang…" : "Pasang sampul (maks 2MB)"}</Button>
        {project.coverImageUrl && (
          <Button type="button" variant="ghost" onClick={removeCover}>Lepas sampul</Button>
        )}
        <Link to=".." className="ml-auto inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
          <Icon name="back" /> Ringkasan
        </Link>
      </form>

      <article className="mx-auto max-w-[680px] rounded-sm border border-line bg-[#fffefa] px-8 py-12 shadow-[0_2px_24px_rgba(28,23,18,0.08)] md:px-14">
        {cover ? (
          <img src={cover} alt="Sampul" className="w-full rounded-[2px]" />
        ) : (
          <div className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 rounded-[2px] border border-line bg-paper">
            <p className="kicker">sampul belum dipasang</p>
            <p className="font-display px-8 text-center text-2xl text-muted italic">{project.title}</p>
          </div>
        )}

        <p className="kicker mt-10 text-center">novel</p>
        <h1 className="font-display mt-2 text-center text-4xl leading-tight font-semibold md:text-5xl">
          {project.title}
        </h1>
        {project.genre && <p className="mt-2 text-center font-mono text-xs tracking-[0.2em] text-muted uppercase">{project.genre}</p>}

        <div className="rule-double mt-8 pt-6">
          <p className="kicker text-center">daftar isi</p>
          <ol className="mt-3 space-y-1.5">
            {chapters.map((c) => (
              <li key={c.id} className="flex items-baseline gap-2 text-[15px]">
                <span className="font-mono text-xs text-muted">{String(c.chapterNumber).padStart(2, "0")}</span>
                <span className="font-display font-medium">{c.title}</span>
                <span className="mx-1 flex-1 border-b border-dotted border-line" />
                <span className="font-mono text-xs text-muted">{c.wordCount}</span>
              </li>
            ))}
          </ol>
          {chapters.length === 0 && <p className="text-center text-muted italic">Belum ada bab.</p>}
        </div>

        {chapters.map((c, i) => (
          <section key={c.id} className="mt-12">
            {i > 0 && <p className="mb-8 text-center text-line">❦ ❦ ❦</p>}
            <p className="kicker text-center">bab {c.chapterNumber}</p>
            <h2 className="font-display mt-1 text-center text-3xl font-semibold">{c.title}</h2>
            <div className="font-display mt-6 space-y-4 text-[17px] leading-[1.85] text-ink/90">
              {c.content.trim() ? (
                <Para text={c.content} />
              ) : (
                <p className="text-center text-muted italic">(Bab ini belum ditulis.)</p>
              )}
            </div>
          </section>
        ))}
      </article>
    </ProjectShell>
  );
}

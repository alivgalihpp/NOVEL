import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, type Chapter, type Project } from "../lib/api";
import { Badge, Button, Card, Err, Field, Icon, Input, Ok, ProjectShell, Select, Textarea } from "../components/ui";

const STATUSES: Project["status"][] = ["draft", "in_progress", "completed"];
const STATUS_LABEL: Record<Project["status"], string> = {
  draft: "Draf",
  in_progress: "Berjalan",
  completed: "Selesai",
};

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [project, setProject] = React.useState<Project | null>(null);
  const [chapters, setChapters] = React.useState<Chapter[]>([]);
  const [title, setTitle] = React.useState("");
  const [synopsis, setSynopsis] = React.useState("");
  const [status, setStatus] = React.useState<Project["status"]>("draft");
  const [msg, setMsg] = React.useState("");
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    if (!id) return;
    Promise.all([api.getProject(id), api.listChapters(id)])
      .then(([p, c]) => {
        setProject(p.project);
        setTitle(p.project.title);
        setSynopsis(p.project.synopsis ?? "");
        setStatus(p.project.status);
        setChapters(c.chapters);
      })
      .catch(() => setErr("Project tidak ditemukan"));
  }, [id]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    try {
      const res = await api.updateProject(id, {
        title: title.trim(),
        synopsis: synopsis.trim() || undefined,
        status,
      });
      setProject(res.project);
      setMsg("Tersimpan di arsip.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menyimpan");
    }
  }

  async function remove() {
    if (!id || !confirm("Hapus project ini beserta seluruh isinya?")) return;
    await api.deleteProject(id);
    nav("/dashboard");
  }

  if (!project)
    return (
      <ProjectShell title="…">
        <Err message={err} />
        <p>Memuat…</p>
      </ProjectShell>
    );

  const words = chapters.reduce((n, c) => n + c.wordCount, 0);
  const finals = chapters.filter((c) => c.status === "final").length;

  return (
    <ProjectShell
      title={project.title}
      meta={
        <>
          <Badge tone={status === "completed" ? "moss" : status === "in_progress" ? "gold" : "line"}>
            {STATUS_LABEL[status]}
          </Badge>
          {project.genre && <Badge>{project.genre}</Badge>}
          {project.creationMode === "ai_assisted" && <Badge tone="ember">disusun AI</Badge>}
        </>
      }
    >
      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-line bg-line">
        {[
          [`${chapters.length}`, `bab${project.targetChapterCount ? ` / ${project.targetChapterCount}` : ""}`],
          [`${words.toLocaleString("id-ID")}`, "kata tertulis"],
          [`${finals}`, "bab final"],
        ].map(([n, l]) => (
          <div key={l} className="bg-card px-4 py-5 text-center">
            <p className="font-display text-3xl font-semibold">{n}</p>
            <p className="kicker mt-1">{l}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <p className="kicker">Lanjut menulis</p>
          {chapters.length === 0 ? (
            <p className="mt-2 text-sm text-ink-soft">
              Belum ada bab. Susun dulu di <Link to="roadmap" className="underline underline-offset-4">Roadmap</Link>.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-line-soft">
              {chapters.slice(0, 5).map((c) => (
                <li key={c.id} className="flex items-baseline justify-between gap-2 py-1.5 text-sm">
                  <Link to="write" className="truncate hover:underline hover:underline-offset-4">
                    <span className="font-mono text-xs text-muted">{String(c.chapterNumber).padStart(2, "0")}</span>{" "}
                    {c.title}
                  </Link>
                  <span className="shrink-0 font-mono text-xs text-muted">{c.wordCount} kt</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex gap-2">
            <Link to="roadmap"><Button variant="line">Roadmap</Button></Link>
            <Link to="write"><Button variant="primary">Menulis</Button></Link>
          </div>
        </Card>

        <Card className="p-5">
          <p className="kicker">Sampul arsip</p>
          <form onSubmit={save} className="mt-2 space-y-3">
            <Field label="Judul">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field label="Sinopsis">
              <Textarea rows={3} value={synopsis} onChange={(e) => setSynopsis(e.target.value)} />
            </Field>
            <Field label="Status">
              <Select value={status} onChange={(e) => setStatus(e.target.value as Project["status"])}>
                {STATUSES.map((s) => (<option key={s} value={s}>{STATUS_LABEL[s]}</option>))}
              </Select>
            </Field>
            <div className="flex items-center gap-2">
              <Button type="submit" variant="ink">Simpan</Button>
              <Button type="button" variant="danger" onClick={remove}>
                <Icon name="trash" /> Hapus
              </Button>
            </div>
          </form>
          <Ok message={msg} />
          <Err message={err} />
        </Card>
      </div>
    </ProjectShell>
  );
}

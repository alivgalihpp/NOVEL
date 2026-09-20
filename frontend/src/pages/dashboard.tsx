import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, setToken, type Project } from "../lib/api";
import { Badge, Button, Card, Empty, Err, Field, Icon, Input, Textarea, TopBar } from "../components/ui";

const STATUS_TONE: Record<Project["status"], "surface" | "warning" | "accent"> = {
  draft: "surface",
  in_progress: "warning",
  completed: "accent",
};

const STATUS_LABEL: Record<Project["status"], string> = {
  draft: "Draf",
  in_progress: "Berjalan",
  completed: "Selesai",
};

export function Dashboard() {
  const nav = useNavigate();
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [title, setTitle] = React.useState("");
  const [genre, setGenre] = React.useState("");
  const [err, setErr] = React.useState("");
  const [aiOpen, setAiOpen] = React.useState(false);

  async function load() {
    try {
      const res = await api.listProjects();
      setProjects(res.projects);
      setErr("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal memuat project");
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await api.createProject({ title: title.trim(), genre: genre.trim() || undefined });
      setTitle("");
      setGenre("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal membuat project");
    }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Hapus "${name}" beserta seluruh isinya?`)) return;
    try {
      await api.deleteProject(id);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menghapus");
    }
  }

  function logout() {
    setToken(null);
    nav("/login");
  }

  return (
    <div className="min-h-screen bg-bg">
      <TopBar
        right={
          <div className="flex items-center gap-3">
            <Link to="/settings">
              <Button variant="surface">
                <Icon name="gear" /> Pengaturan AI
              </Button>
            </Link>
            <Button variant="ghost" onClick={logout}>
              Keluar
            </Button>
          </div>
        }
      />
      <main className="mx-auto max-w-7xl px-6 py-10 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-6">
          <div>
            <p className="kicker">Studio Penulisan</p>
            <h1 className="font-display mt-2 text-4xl font-extrabold tracking-tight text-ink">Manuskrip Saya</h1>
          </div>
          <div className="flex gap-3">
            <Button variant="primary" onClick={() => setAiOpen((v) => !v)}>
              <Icon name="spark" /> Mulai via AI Wizard
            </Button>
          </div>
        </div>

        <Err message={err} />

        {aiOpen ? (
          <AiAssistForm onDone={() => { setAiOpen(false); load(); }} />
        ) : (
          <Card className="glass border-border/80">
            <form onSubmit={create} className="flex flex-col gap-4 md:flex-row md:items-end">
              <div className="flex-1">
                <Field label="Judul Novel (Manual)">
                  <Input id="manual-title" placeholder="e.g. Kronik Bintang Terakhir" value={title} onChange={(e) => setTitle(e.target.value)} />
                </Field>
              </div>
              <div className="md:w-64">
                <Field label="Genre">
                  <Input placeholder="Cyberpunk / Fantasi" value={genre} onChange={(e) => setGenre(e.target.value)} />
                </Field>
              </div>
              <Button variant="surface" type="submit">
                Buat Lembar Kerja Manual
              </Button>
            </form>
          </Card>
        )}

        {projects.length === 0 ? (
          <Empty title="Belum Ada Manuskrip" hint="Mulai menulis kisah barumu hari ini menggunakan AI wizard atau lembar manual.">
            <Button variant="primary" onClick={() => setAiOpen(true)}>
              <Icon name="spark" /> Rancang via AI
            </Button>
          </Empty>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Link key={p.id} to={`/projects/${p.id}`} className="group block">
                <Card className="flex h-full flex-col justify-between border-border hover:border-accent/40 hover:bg-surface/50 transition-all duration-200">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                      <span className="font-mono text-xs text-ink-soft">
                        {p.creationMode === "ai_assisted" ? "⚡ AI Start" : "✍️ Manual"}
                      </span>
                    </div>
                    <h3 className="font-display text-2xl font-bold tracking-tight text-ink group-hover:text-accent transition-colors">
                      {p.title}
                    </h3>
                    <p className="mt-2 text-xs font-medium text-ink-soft">
                      {[p.genre, p.targetChapterCount ? `${p.targetChapterCount} Bab` : null].filter(Boolean).join(" • ") || "Tanpa genre"}
                    </p>
                    {p.synopsis && <p className="mt-3 line-clamp-3 text-sm text-ink-soft/80 leading-relaxed">{p.synopsis}</p>}
                  </div>
                  <div className="mt-6 flex items-center justify-between border-t border-border/40 pt-4">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent group-hover:translate-x-1 transition-transform">
                      Buka Ruang Studio <Icon name="back" className="h-3 w-3 rotate-180" />
                    </span>
                    <button
                      onClick={(e) => { e.preventDefault(); remove(p.id, p.title); }}
                      className="rounded-lg p-2 text-ink-soft hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                      title="Hapus"
                    >
                      <Icon name="trash" />
                    </button>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function AiAssistForm({ onDone }: { onDone: () => void }) {
  const nav = useNavigate();
  const [f, setF] = React.useState({ title: "", genre: "", synopsis: "", mainCharacter: "", plotTwist: "", goals: "", chapterCount: "7" });
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await api.aiAssist({
        title: f.title.trim(),
        genre: f.genre.trim() || undefined,
        synopsis: f.synopsis.trim(),
        mainCharacter: f.mainCharacter.trim(),
        plotTwist: f.plotTwist.trim() || undefined,
        goals: f.goals.trim(),
        chapterCount: Math.max(1, Math.min(100, Number(f.chapterCount) || 7)),
      });
      onDone();
      nav(`/projects/${res.project.id}/roadmap`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal generate");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-accent/40 bg-card">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <Icon name="spark" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-ink">AI Architect Wizard</h2>
          <p className="text-xs text-ink-soft">Rancang seluruh pondasi cerita, tokoh, dan bab secara otomatis.</p>
        </div>
      </div>
      <form onSubmit={submit} className="mt-6 grid gap-5 md:grid-cols-2">
        <Field label="Judul Novel *">
          <Input value={f.title} onChange={set("title")} required />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Genre">
            <Input value={f.genre} onChange={set("genre")} />
          </Field>
          <Field label="Target Bab *">
            <Input type="number" min={1} max={100} value={f.chapterCount} onChange={set("chapterCount")} required />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Sinopsis Cerita *">
            <Textarea rows={3} value={f.synopsis} onChange={set("synopsis")} required />
          </Field>
        </div>
        <Field label="Tokoh Utama (Nama & Karakter) *">
          <Input value={f.mainCharacter} onChange={set("mainCharacter")} required />
        </Field>
        <Field label="Plot Twist (Opsional)">
          <Input value={f.plotTwist} onChange={set("plotTwist")} />
        </Field>
        <div className="md:col-span-2">
          <Field label="Tujuan Akhir Cerita *">
            <Input value={f.goals} onChange={set("goals")} required />
          </Field>
        </div>
        {err && <div className="md:col-span-2"><Err message={err} /></div>}
        <div className="md:col-span-2 flex justify-end">
          <Button variant="primary" disabled={busy}>
            {busy ? "Menganalisis & Menyusun..." : "Generate Arsitektur Cerita"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

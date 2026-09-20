import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, setToken, type Project } from "../lib/api";
import { Badge, Button, Card, Empty, Err, Field, Icon, Input, Textarea, TopBar } from "../components/ui";

const STATUS_TONE: Record<Project["status"], "line" | "gold" | "moss"> = {
  draft: "line",
  in_progress: "gold",
  completed: "moss",
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
    <div className="min-h-screen">
      <TopBar
        right={
          <div className="flex items-center gap-2">
            <Link to="/settings" className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-paper/80 hover:bg-white/10 hover:text-paper">
              <Icon name="gear" /> <span className="hidden sm:inline">Pengaturan</span>
            </Link>
            <button onClick={logout} className="rounded-md bg-white/10 px-3 py-2 text-sm text-paper hover:bg-white/20">
              Keluar
            </button>
          </div>
        }
      />
      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="kicker">meja kerja</p>
            <h1 className="font-display mt-1 text-4xl font-semibold">Naskah-naskahmu</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="line" onClick={() => setAiOpen((v) => !v)}>
              <Icon name="spark" /> Dibantu AI
            </Button>
            <Button variant="primary" onClick={() => document.getElementById("manual-title")?.focus()}>
              <Icon name="plus" /> Project manual
            </Button>
          </div>
        </div>

        <Err message={err} />

        {aiOpen && <AiAssistForm onDone={() => { setAiOpen(false); load(); }} />}

        <Card className="mt-6 p-5">
          <form onSubmit={create} className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1">
              <Field label="Judul novel baru">
                <Input id="manual-title" placeholder="cth. Senja di Ujung Rel" value={title} onChange={(e) => setTitle(e.target.value)} />
              </Field>
            </div>
            <div className="md:w-56">
              <Field label="Genre (opsional)">
                <Input placeholder="Fantasi" value={genre} onChange={(e) => setGenre(e.target.value)} />
              </Field>
            </div>
            <Button variant="ink" type="submit">Taruh di meja</Button>
          </form>
        </Card>

        {projects.length === 0 ? (
          <div className="mt-6">
            <Empty title="Meja masih kosong." hint="Mulai dari judul di atas, atau biarkan AI menyiapkan kerangkanya.">
              <Button variant="line" onClick={() => setAiOpen(true)}>
                <Icon name="spark" /> Coba mode Dibantu AI
              </Button>
            </Empty>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p, i) => (
              <Link key={p.id} to={`/projects/${p.id}`} className="group">
                <Card className="flex h-full flex-col p-5 transition-colors group-hover:border-ink-soft">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-display text-4xl text-line italic select-none">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                  </div>
                  <h3 className="font-display mt-2 text-2xl leading-snug font-semibold group-hover:underline group-hover:decoration-ember group-hover:underline-offset-4">
                    {p.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted">
                    {[p.genre, p.targetChapterCount ? `${p.targetChapterCount} bab` : null, p.creationMode === "ai_assisted" ? "AI" : "manual"]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </p>
                  {p.synopsis && <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{p.synopsis}</p>}
                  <div className="mt-auto flex items-center justify-between pt-4">
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ember-deep">
                      Buka <Icon name="back" className="h-3.5 w-3.5 rotate-180" />
                    </span>
                    <button
                      onClick={(e) => { e.preventDefault(); remove(p.id, p.title); }}
                      className="rounded p-1.5 text-muted hover:bg-oxblood/10 hover:text-oxblood"
                      title="Hapus project"
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
    <Card className="mt-6 border-ember/50 p-5">
      <div className="flex items-center gap-2">
        <Icon name="spark" className="text-ember" />
        <h2 className="font-display text-2xl font-semibold">Dibantu AI</h2>
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        Isi formulir singkat — AI menyusun roadmap + tokoh + tempat awal. Semuanya bisa diubah total.
        Tanpa kunci API, dipakai provider Mock (<Link to="/settings" className="underline underline-offset-4">atur di sini</Link>).
      </p>
      <form onSubmit={submit} className="mt-4 grid gap-4 md:grid-cols-2">
        <Field label="Judul novel *">
          <Input value={f.title} onChange={set("title")} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Genre">
            <Input value={f.genre} onChange={set("genre")} />
          </Field>
          <Field label="Jumlah bab *">
            <Input type="number" min={1} max={100} value={f.chapterCount} onChange={set("chapterCount")} />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Sinopsis *">
            <Textarea rows={3} value={f.synopsis} onChange={set("synopsis")} />
          </Field>
        </div>
        <Field label="Tokoh utama (nama + deskripsi) *">
          <Input value={f.mainCharacter} onChange={set("mainCharacter")} />
        </Field>
        <Field label="Plot twist (kosongkan = AI menentukan)">
          <Input value={f.plotTwist} onChange={set("plotTwist")} />
        </Field>
        <div className="md:col-span-2">
          <Field label="Goals / pesan cerita *">
            <Input value={f.goals} onChange={set("goals")} />
          </Field>
        </div>
        {err && <div className="md:col-span-2"><Err message={err} /></div>}
        <div className="md:col-span-2">
          <Button variant="primary" disabled={busy}>{busy ? "Menyusun kerangka… (bisa ±1 menit)" : "Susunkan kerangka"}</Button>
        </div>
      </form>
    </Card>
  );
}

import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, setToken, type Project } from "../lib/api";
import { box, input } from "../components/auth";

export function Dashboard() {
  const nav = useNavigate();
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [title, setTitle] = React.useState("");
  const [genre, setGenre] = React.useState("");
  const [err, setErr] = React.useState("");

  async function load() {
    try {
      const res = await api.listProjects();
      setProjects(res.projects);
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
      await api.createProject({
        title: title.trim(),
        genre: genre.trim() || undefined,
      });
      setTitle("");
      setGenre("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal membuat project");
    }
  }

  async function remove(id: string) {
    if (!confirm("Hapus project ini beserta seluruh isinya?")) return;
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
  }  return (
    <main style={box}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Dashboard</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <Link to="/settings">Pengaturan AI</Link>
          <button onClick={logout}>Keluar</button>
        </div>
      </div>

      <h2>Buat Project Baru (manual)</h2>
      <form onSubmit={create}>
        <input style={input} placeholder="Judul novel" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input style={input} placeholder="Genre (opsional)" value={genre} onChange={(e) => setGenre(e.target.value)} />
        <button type="submit">Buat</button>
      </form>

      <AiAssistForm onDone={load} />

      <h2>Daftar Project ({projects.length})</h2>
      {err && <p style={{ color: "crimson" }}>{err}</p>}
      <ul>
        {projects.map((p) => (
          <li key={p.id} style={{ marginBottom: 8 }}>
            <Link to={`/projects/${p.id}`}>{p.title}</Link>{" "}
            <small>
              [{p.status}] {p.genre ?? "-"}
            </small>{" "}
            <button onClick={() => remove(p.id)}>Hapus</button>
          </li>
        ))}
      </ul>
      {projects.length === 0 && <p>Belum ada project. Buat satu di atas.</p>}
    </main>
  );
}

/** Form onboarding "Dibantu AI" (PRD §3.2) — roadmap + placeholder dibuatkan AI, 100% bisa diedit. */
function AiAssistForm({ onDone }: { onDone: () => void }) {
  const nav = useNavigate();
  const [open, setOpen] = React.useState(false);
  const [f, setF] = React.useState({
    title: "",
    genre: "",
    synopsis: "",
    mainCharacter: "",
    plotTwist: "",
    goals: "",
    chapterCount: "7",
  });
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

  if (!open)
    return (
      <p>
        <button onClick={() => setOpen(true)}>Buat project Dibantu AI</button>
      </p>
    );

  return (
    <section style={{ border: "1px solid #ccc", borderRadius: 8, padding: 12, margin: "12px 0" }}>
      <h2>Dibantu AI — form singkat</h2>
      <p style={{ fontSize: 13, color: "#666" }}>
        AI membuatkan roadmap + placeholder karakter/tempat. Semua bisa diubah total setelahnya.
        Tanpa kunci API, dipakai provider Mock (lihat <Link to="/settings">Pengaturan AI</Link>).
      </p>
      <form onSubmit={submit}>
        <input style={input} placeholder="Judul novel *" value={f.title} onChange={set("title")} />
        <input style={input} placeholder="Genre (opsional)" value={f.genre} onChange={set("genre")} />
        <label>Sinopsis *</label>
        <textarea style={{ ...input, minHeight: 80 }} value={f.synopsis} onChange={set("synopsis")} />
        <label>Tokoh utama (nama + deskripsi singkat) *</label>
        <input style={input} value={f.mainCharacter} onChange={set("mainCharacter")} />
        <label>Plot twist (opsional — kosongkan bila ingin AI yang menentukan)</label>
        <input style={input} value={f.plotTwist} onChange={set("plotTwist")} />
        <label>Goals / tujuan cerita *</label>
        <input style={input} value={f.goals} onChange={set("goals")} />
        <label>Jumlah bab *</label>
        <input style={input} type="number" min={1} max={100} value={f.chapterCount} onChange={set("chapterCount")} />
        {err && <p style={{ color: "crimson" }}>{err}</p>}
        <button type="submit" disabled={busy}>{busy ? "Generate... (bisa ~1 menit)" : "Generate roadmap"}</button>{" "}
        <button type="button" onClick={() => setOpen(false)}>Batal</button>
      </form>
    </section>
  );
}

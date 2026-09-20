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
  }

  return (
    <main style={box}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Dashboard</h1>
        <button onClick={logout}>Keluar</button>
      </div>

      <h2>Buat Project Baru (manual)</h2>
      <form onSubmit={create}>
        <input style={input} placeholder="Judul novel" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input style={input} placeholder="Genre (opsional)" value={genre} onChange={(e) => setGenre(e.target.value)} />
        <button type="submit">Buat</button>
      </form>
      <p style={{ color: "#666", fontSize: 14 }}>
        Mode “Dibantu AI” hadir di Fase 6 (PRD §3.2).
      </p>

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

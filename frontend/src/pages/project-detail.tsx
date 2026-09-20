import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, type Project } from "../lib/api";
import { box, input } from "../components/auth";

const STATUSES: Project["status"][] = ["draft", "in_progress", "completed"];

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [project, setProject] = React.useState<Project | null>(null);
  const [title, setTitle] = React.useState("");
  const [synopsis, setSynopsis] = React.useState("");
  const [status, setStatus] = React.useState<Project["status"]>("draft");
  const [msg, setMsg] = React.useState("");

  React.useEffect(() => {
    if (!id) return;
    api
      .getProject(id)
      .then((res) => {
        setProject(res.project);
        setTitle(res.project.title);
        setSynopsis(res.project.synopsis ?? "");
        setStatus(res.project.status);
      })
      .catch(() => setMsg("Project tidak ditemukan"));
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
      setMsg("Tersimpan.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Gagal menyimpan");
    }
  }

  async function remove() {
    if (!id || !confirm("Hapus project ini?")) return;
    await api.deleteProject(id);
    nav("/dashboard");
  }

  if (!project) return <main style={box}><p>{msg || "Memuat..."}</p><Link to="/dashboard">← Dashboard</Link></main>;

  return (
    <main style={box}>
      <Link to="/dashboard">← Dashboard</Link>
      <h1>Project: {project.title}</h1>
      <form onSubmit={save}>
        <label>Judul</label>
        <input style={input} value={title} onChange={(e) => setTitle(e.target.value)} />
        <label>Sinopsis</label>
        <textarea style={{ ...input, minHeight: 100 }} value={synopsis} onChange={(e) => setSynopsis(e.target.value)} />
        <label>Status</label>
        <select style={input} value={status} onChange={(e) => setStatus(e.target.value as Project["status"])}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button type="submit">Simpan</button>{" "}
        <button type="button" onClick={remove}>Hapus project</button>
      </form>
      {msg && <p>{msg}</p>}
      <hr />
      <h3>Modul project</h3>
      <ul>
        <li><Link to={`/projects/${id}/roadmap`}>Roadmap (Alur Cerita)</Link></li>
        <li><Link to={`/projects/${id}/write`}>Menulis</Link></li>
        <li><Link to={`/projects/${id}/preview`}>Preview</Link></li>
        <li><Link to={`/projects/${id}/characters`}>Perpustakaan Karakter</Link></li>
        <li><Link to={`/projects/${id}/places`}>Perpustakaan Tempat</Link></li>
        <li>Menulis — Fase 5</li>
      </ul>
    </main>
  );
}

import React from "react";
import { Link, useParams } from "react-router-dom";
import { api, type Chapter, type Project } from "../lib/api";
import { box } from "../components/auth";

function Para({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n{2,}|\n/).map((p, i) =>
        p.trim() ? <p key={i} style={{ lineHeight: 1.8 }}>{p.trim()}</p> : null,
      )}
    </>
  );
}

export function PreviewPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const [project, setProject] = React.useState<Project | null>(null);
  const [chapters, setChapters] = React.useState<Chapter[]>([]);
  const [msg, setMsg] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function load() {
    if (!projectId) return;
    try {
      const [p, c] = await Promise.all([
        api.getProject(projectId),
        api.listChapters(projectId),
      ]);
      setProject(p.project);
      setChapters(c.chapters);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Gagal memuat");
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
      setMsg("Cover terupload.");
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Upload gagal");
    } finally {
      setBusy(false);
    }
  }

  async function removeCover() {
    if (!projectId || !confirm("Hapus cover (kembali putih polos)?")) return;
    await api.deleteCover(projectId);
    load();
  }

  if (!project)
    return (
      <main style={box}>
        <p>{msg || "Memuat..."}</p>
        <Link to="/dashboard">← Dashboard</Link>
      </main>
    );

  const cover = api.coverSrc(project.coverImageUrl);
  const totalWords = chapters.reduce((n, c) => n + c.wordCount, 0);

  return (
    <main style={box}>
      <Link to={`/projects/${projectId}`}>← Project</Link>
      <h1>Preview</h1>
      {msg && <p>{msg}</p>}
      <form onSubmit={upload} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" />
        <button type="submit" disabled={busy}>{busy ? "Upload..." : "Upload cover (maks 2MB)"}</button>
        {project.coverImageUrl && (
          <button type="button" onClick={removeCover}>Hapus cover</button>
        )}
      </form>

      {/* Tampilan buku (PRD §3.8) */}
      <article
        style={{
          border: "1px solid #ccc",
          borderRadius: 4,
          padding: "48px 40px",
          maxWidth: 680,
          margin: "0 auto",
          background: "#fff",
          fontFamily: "Georgia, serif",
        }}
      >
        {cover ? (
          <img src={cover} alt="Cover" style={{ width: "100%", borderRadius: 4 }} />
        ) : (
          <div
            style={{
              width: "100%",
              aspectRatio: "3 / 4",
              background: "#fff",
              border: "2px solid #eee",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#999",
            }}
          >
            (Cover putih polos — upload cover sendiri di atas)
          </div>
        )}
        <h1 style={{ textAlign: "center", marginTop: 32 }}>{project.title}</h1>
        {project.genre && <p style={{ textAlign: "center", color: "#666" }}>{project.genre}</p>}
        <p style={{ textAlign: "center", color: "#999", fontSize: 14 }}>{totalWords} kata · {chapters.length} bab</p>

        <h2>Daftar Isi</h2>
        <ol>
          {chapters.map((c) => (
            <li key={c.id}>
              Bab {c.chapterNumber}: {c.title} <small>({c.wordCount} kata)</small>
            </li>
          ))}
        </ol>
        {chapters.length === 0 && <p><em>Belum ada bab.</em></p>}

        {chapters.map((c) => (
          <section key={c.id} style={{ marginTop: 40 }}>
            <h2>Bab {c.chapterNumber}: {c.title}</h2>
            {c.content.trim() ? (
              <Para text={c.content} />
            ) : (
              <p><em>(Bab ini belum ditulis.)</em></p>
            )}
          </section>
        ))}
      </article>
    </main>
  );
}

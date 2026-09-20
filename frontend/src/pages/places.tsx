import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, type Place } from "../lib/api";
import { box, input } from "../components/auth";

export function PlacesPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const [places, setPlaces] = React.useState<Place[]>([]);
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState("");
  const [placeholder, setPlaceholder] = React.useState(false);
  const [err, setErr] = React.useState("");

  async function load() {
    if (!projectId) return;
    try {
      const res = await api.listPlaces(projectId);
      setPlaces(res.places);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal memuat tempat");
    }
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId || !name.trim()) return;
    try {
      await api.createPlace(projectId, {
        name: name.trim(),
        type: type.trim() || undefined,
        isPlaceholder: placeholder,
      });
      setName("");
      setType("");
      setPlaceholder(false);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal membuat tempat");
    }
  }

  async function remove(placeId: string) {
    if (!projectId || !confirm("Hapus tempat ini?")) return;
    try {
      await api.deletePlace(projectId, placeId);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menghapus");
    }
  }

  return (
    <main style={box}>
      <Link to={`/projects/${projectId}`}>← Project</Link>
      <h1>Perpustakaan Tempat ({places.length})</h1>
      {err && <p style={{ color: "crimson" }}>{err}</p>}
      <form onSubmit={create}>
        <input style={input} placeholder="Nama tempat" value={name} onChange={(e) => setName(e.target.value)} />
        <input style={input} placeholder="Tipe (kota/kerajaan/gedung/...)" value={type} onChange={(e) => setType(e.target.value)} />
        <label>
          <input type="checkbox" checked={placeholder} onChange={(e) => setPlaceholder(e.target.checked)} /> Placeholder (belum final)
        </label>
        <div><button type="submit">Tambah</button></div>
      </form>
      <ul>
        {places.map((p) => (
          <li key={p.id} style={{ marginBottom: 8 }}>
            <Link to={`/projects/${projectId}/places/${p.id}`}>{p.name}</Link>{" "}
            <small>[{p.type ?? "-"}]</small>{" "}
            {p.isPlaceholder && <small style={{ background: "#eee", padding: "2px 6px" }}>placeholder</small>}{" "}
            <button onClick={() => remove(p.id)}>Hapus</button>
          </li>
        ))}
      </ul>
      {places.length === 0 && <p>Belum ada tempat.</p>}
    </main>
  );
}

export function PlaceDetailPage() {
  const { id: projectId, placeId } = useParams<{ id: string; placeId: string }>();
  const nav = useNavigate();
  const [place, setPlace] = React.useState<Place | null>(null);
  const [form, setForm] = React.useState({ name: "", type: "", description: "", imageUrl: "", isPlaceholder: false });
  const [msg, setMsg] = React.useState("");

  async function load() {
    if (!projectId || !placeId) return;
    try {
      const res = await api.getPlace(projectId, placeId);
      setPlace(res.place);
      setForm({
        name: res.place.name,
        type: res.place.type ?? "",
        description: res.place.description ?? "",
        imageUrl: res.place.imageUrl ?? "",
        isPlaceholder: res.place.isPlaceholder,
      });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Gagal memuat");
    }
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, placeId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId || !placeId) return;
    try {
      const res = await api.updatePlace(projectId, placeId, {
        name: form.name.trim(),
        type: form.type.trim() || undefined,
        description: form.description.trim() || undefined,
        imageUrl: form.imageUrl.trim() || undefined,
        isPlaceholder: form.isPlaceholder,
      });
      setPlace(res.place);
      setMsg("Tersimpan.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Gagal menyimpan");
    }
  }

  if (!place) return <main style={box}><p>{msg || "Memuat..."}</p><Link to={`/projects/${projectId}/places`}>← Tempat</Link></main>;

  return (
    <main style={box}>
      <Link to={`/projects/${projectId}/places`}>← Tempat</Link>
      <h1>{place.name}</h1>
      <form onSubmit={save}>
        <label>Nama</label>
        <input style={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <label>Tipe</label>
        <input style={input} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
        <label>Deskripsi</label>
        <textarea style={{ ...input, minHeight: 100 }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <label>Gambar URL (opsional)</label>
        <input style={input} value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
        <label><input type="checkbox" checked={form.isPlaceholder} onChange={(e) => setForm({ ...form, isPlaceholder: e.target.checked })} /> Placeholder</label>
        <div>
          <button type="submit">Simpan</button>{" "}
          <button type="button" onClick={async () => { if (projectId && placeId && confirm("Hapus tempat ini?")) { await api.deletePlace(projectId, placeId); nav(`/projects/${projectId}/places`); } }}>Hapus tempat</button>
        </div>
      </form>
      {msg && <p>{msg}</p>}
    </main>
  );
}

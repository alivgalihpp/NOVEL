import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, type Place } from "../lib/api";
import { Badge, Button, Card, Empty, Err, Field, Icon, Input, Ok, ProjectShell, Textarea } from "../components/ui";

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
      setErr("");
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
      await api.createPlace(projectId, { name: name.trim(), type: type.trim() || undefined, isPlaceholder: placeholder });
      setName("");
      setType("");
      setPlaceholder(false);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal membuat tempat");
    }
  }

  async function remove(placeId: string, placeName: string) {
    if (!projectId || !confirm(`Hapus "${placeName}"?`)) return;
    try {
      await api.deletePlace(projectId, placeId);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menghapus");
    }
  }

  return (
    <ProjectShell title="Atlas cerita" meta={<Badge>{places.length} lokasi</Badge>}>
      <p className="kicker">perpustakaan tempat</p>
      <Err message={err} />

      <Card className="mt-3 p-4">
        <form onSubmit={create} className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <Field label="Nama tempat baru">
              <Input placeholder="cth. Pelabuhan Senja" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
          </div>
          <div className="md:w-52">
            <Field label="Tipe (kota/kerajaan/…)">
              <Input value={type} onChange={(e) => setType(e.target.value)} />
            </Field>
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm text-ink-soft">
            <input type="checkbox" checked={placeholder} onChange={(e) => setPlaceholder(e.target.checked)} className="accent-[#bc4b1f]" />
            Placeholder
          </label>
          <Button variant="ink" type="submit"><Icon name="plus" /> Tambah</Button>
        </form>
      </Card>

      {places.length === 0 ? (
        <div className="mt-4"><Empty title="Peta masih kosong." hint="Tandai lokasi penting ceritamu lewat formulir di atas." /></div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {places.map((p) => (
            <Link key={p.id} to={p.id} className="group">
              <Card className="h-full p-4 transition-colors group-hover:border-ink-soft">
                <div className="flex items-center gap-2">
                  <Icon name="pin" className="text-ember" />
                  <span className="font-display truncate text-xl font-semibold group-hover:underline group-hover:decoration-ember group-hover:underline-offset-4">
                    {p.name}
                  </span>
                  <button
                    onClick={(e) => { e.preventDefault(); remove(p.id, p.name); }}
                    className="ml-auto rounded p-1.5 text-muted hover:bg-oxblood/10 hover:text-oxblood"
                    title="Hapus"
                  >
                    <Icon name="trash" />
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.type ? <Badge>{p.type}</Badge> : <Badge>tanpa tipe</Badge>}
                  {p.isPlaceholder && <Badge>placeholder</Badge>}
                </div>
                {p.description && <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{p.description}</p>}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </ProjectShell>
  );
}

export function PlaceDetailPage() {
  const { id: projectId, placeId } = useParams<{ id: string; placeId: string }>();
  const nav = useNavigate();
  const [place, setPlace] = React.useState<Place | null>(null);
  const [form, setForm] = React.useState({ name: "", type: "", description: "", imageUrl: "", isPlaceholder: false });
  const [msg, setMsg] = React.useState("");
  const [err, setErr] = React.useState("");

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
      setErr("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal memuat");
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
      setMsg("Tersimpan di atlas.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menyimpan");
    }
  }

  if (!place)
    return (
      <ProjectShell title="…">
        <Err message={err} />
        <p>Memuat…</p>
      </ProjectShell>
    );

  return (
    <ProjectShell
      title={place.name}
      meta={<>{place.type && <Badge>{place.type}</Badge>}{place.isPlaceholder && <Badge>placeholder</Badge>}</>}
    >
      <Link to=".." className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
        <Icon name="back" /> Kembali ke atlas
      </Link>
      <Err message={err} />
      <Ok message={msg} />

      <Card className="mt-3 p-5">
        <p className="kicker">catatan lokasi</p>
        <form onSubmit={save} className="mt-3 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Nama">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Tipe">
              <Input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
            </Field>
          </div>
          <Field label="Deskripsi">
            <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label="Gambar URL (opsional)">
            <Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" checked={form.isPlaceholder} onChange={(e) => setForm({ ...form, isPlaceholder: e.target.checked })} className="accent-[#bc4b1f]" />
            Tandai sebagai placeholder
          </label>
          <div className="flex items-center gap-2">
            <Button type="submit" variant="ink">Simpan</Button>
            <button
              type="button"
              onClick={async () => { if (projectId && placeId && confirm(`Hapus "${place.name}"?`)) { await api.deletePlace(projectId, placeId); nav(".."); } }}
              className="inline-flex items-center gap-1.5 text-sm text-oxblood hover:underline hover:underline-offset-4"
            >
              <Icon name="trash" /> Hapus tempat
            </button>
          </div>
        </form>
      </Card>
    </ProjectShell>
  );
}

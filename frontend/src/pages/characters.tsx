import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  api,
  REL_LABEL,
  ROLE_LABEL,
  type Character,
  type CharacterRole,
  type RelationshipType,
} from "../lib/api";
import { box, input } from "../components/auth";

const ROLES = Object.keys(ROLE_LABEL) as CharacterRole[];
const RELS = Object.keys(REL_LABEL) as RelationshipType[];

export function CharactersPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const [chars, setChars] = React.useState<Character[]>([]);
  const [name, setName] = React.useState("");
  const [role, setRole] = React.useState<CharacterRole>("supporting");
  const [placeholder, setPlaceholder] = React.useState(false);
  const [err, setErr] = React.useState("");

  async function load() {
    if (!projectId) return;
    try {
      const res = await api.listCharacters(projectId);
      setChars(res.characters);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal memuat karakter");
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
      await api.createCharacter(projectId, {
        name: name.trim(),
        role,
        isPlaceholder: placeholder,
      });
      setName("");
      setPlaceholder(false);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal membuat karakter");
    }
  }

  async function remove(charId: string) {
    if (!projectId || !confirm("Hapus karakter ini?")) return;
    try {
      await api.deleteCharacter(projectId, charId);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menghapus");
    }
  }

  return (
    <main style={box}>
      <Link to={`/projects/${projectId}`}>← Project</Link>
      <h1>Perpustakaan Karakter ({chars.length})</h1>
      {err && <p style={{ color: "crimson" }}>{err}</p>}
      <form onSubmit={create}>
        <input style={input} placeholder="Nama karakter" value={name} onChange={(e) => setName(e.target.value)} />
        <select style={input} value={role} onChange={(e) => setRole(e.target.value as CharacterRole)}>
          {ROLES.map((r) => (
            <option key={r} value={r}>{ROLE_LABEL[r]}</option>
          ))}
        </select>
        <label>
          <input type="checkbox" checked={placeholder} onChange={(e) => setPlaceholder(e.target.checked)} /> Placeholder (belum final)
        </label>
        <div><button type="submit">Tambah</button></div>
      </form>
      <ul>
        {chars.map((c) => (
          <li key={c.id} style={{ marginBottom: 8 }}>
            <Link to={`/projects/${projectId}/characters/${c.id}`}>{c.name}</Link>{" "}
            <small>[{ROLE_LABEL[c.role]}]</small>{" "}
            {c.isPlaceholder && <small style={{ background: "#eee", padding: "2px 6px" }}>placeholder</small>}{" "}
            <button onClick={() => remove(c.id)}>Hapus</button>
          </li>
        ))}
      </ul>
      {chars.length === 0 && <p>Belum ada karakter.</p>}
    </main>
  );
}

export function CharacterDetailPage() {
  const { id: projectId, charId } = useParams<{ id: string; charId: string }>();
  const nav = useNavigate();
  const [char, setChar] = React.useState<Character | null>(null);
  const [others, setOthers] = React.useState<Character[]>([]);
  const [rels, setRels] = React.useState<
    { id: string; relationshipType: RelationshipType; note: string | null; otherName: string; direction: string }[]
  >([]);
  const [form, setForm] = React.useState({ name: "", role: "supporting" as CharacterRole, physicalDescription: "", personalityTraits: "", backstory: "", avatarUrl: "", isPlaceholder: false });
  const [relTarget, setRelTarget] = React.useState("");
  const [relType, setRelType] = React.useState<RelationshipType>("sibling");
  const [msg, setMsg] = React.useState("");

  async function load() {
    if (!projectId || !charId) return;
    try {
      const [c, all, r] = await Promise.all([
        api.getCharacter(projectId, charId),
        api.listCharacters(projectId),
        api.listRelationships(projectId, charId),
      ]);
      setChar(c.character);
      setForm({
        name: c.character.name,
        role: c.character.role,
        physicalDescription: c.character.physicalDescription ?? "",
        personalityTraits: c.character.personalityTraits ?? "",
        backstory: c.character.backstory ?? "",
        avatarUrl: c.character.avatarUrl ?? "",
        isPlaceholder: c.character.isPlaceholder,
      });
      setOthers(all.characters.filter((x) => x.id !== charId));
      const byId = new Map(all.characters.map((x) => [x.id, x.name]));
      setRels(
        r.relationships.map((rel) => {
          const outgoing = rel.characterId === charId;
          const otherId = outgoing ? rel.relatedCharacterId : rel.characterId;
          return {
            id: rel.id,
            relationshipType: rel.relationshipType,
            note: rel.note,
            otherName: byId.get(otherId) ?? "(dihapus)",
            direction: outgoing ? "→" : "←",
          };
        }),
      );
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Gagal memuat");
    }
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, charId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId || !charId) return;
    try {
      const res = await api.updateCharacter(projectId, charId, {
        name: form.name.trim(),
        role: form.role,
        physicalDescription: form.physicalDescription.trim() || undefined,
        personalityTraits: form.personalityTraits.trim() || undefined,
        backstory: form.backstory.trim() || undefined,
        avatarUrl: form.avatarUrl.trim() || undefined,
        isPlaceholder: form.isPlaceholder,
      });
      setChar(res.character);
      setMsg("Tersimpan.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Gagal menyimpan");
    }
  }

  async function addRel(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId || !charId || !relTarget) return;
    try {
      await api.createRelationship(projectId, charId, {
        relatedCharacterId: relTarget,
        relationshipType: relType,
      });
      setRelTarget("");
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Gagal menambah relasi");
    }
  }

  async function delRel(relId: string) {
    if (!projectId || !charId || !confirm("Hapus relasi ini?")) return;
    await api.deleteRelationship(projectId, charId, relId);
    await load();
  }

  if (!char) return <main style={box}><p>{msg || "Memuat..."}</p><Link to={`/projects/${projectId}/characters`}>← Karakter</Link></main>;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <main style={box}>
      <Link to={`/projects/${projectId}/characters`}>← Karakter</Link>
      <h1>{char.name}</h1>
      <form onSubmit={save}>
        <label>Nama</label>
        <input style={input} value={form.name} onChange={set("name")} />
        <label>Peran</label>
        <select style={input} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as CharacterRole })}>
          {ROLES.map((r) => (<option key={r} value={r}>{ROLE_LABEL[r]}</option>))}
        </select>
        <label>Deskripsi fisik</label>
        <textarea style={{ ...input, minHeight: 60 }} value={form.physicalDescription} onChange={set("physicalDescription")} />
        <label>Sifat</label>
        <textarea style={{ ...input, minHeight: 60 }} value={form.personalityTraits} onChange={set("personalityTraits")} />
        <label>Latar belakang</label>
        <textarea style={{ ...input, minHeight: 80 }} value={form.backstory} onChange={set("backstory")} />
        <label>Avatar URL (opsional)</label>
        <input style={input} value={form.avatarUrl} onChange={set("avatarUrl")} />
        <label><input type="checkbox" checked={form.isPlaceholder} onChange={(e) => setForm({ ...form, isPlaceholder: e.target.checked })} /> Placeholder</label>
        <div><button type="submit">Simpan</button></div>
      </form>
      {msg && <p>{msg}</p>}
      <hr />
      <h2>Relasi keluarga</h2>
      <p style={{ fontSize: 14, color: "#666" }}>Hanya relasi parent/child/sibling/spouse yang tampil di Family Tree (Fase 4).</p>
      <ul>
        {rels.map((r) => (
          <li key={r.id}>{r.direction} {r.otherName} — {REL_LABEL[r.relationshipType]} <button onClick={() => delRel(r.id)}>Hapus</button></li>
        ))}
      </ul>
      {rels.length === 0 && <p>Belum ada relasi.</p>}
      {others.length > 0 && (
        <form onSubmit={addRel}>
          <select style={input} value={relTarget} onChange={(e) => setRelTarget(e.target.value)}>
            <option value="">— pilih karakter —</option>
            {others.map((o) => (<option key={o.id} value={o.id}>{o.name}</option>))}
          </select>
          <select style={input} value={relType} onChange={(e) => setRelType(e.target.value as RelationshipType)}>
            {RELS.map((r) => (<option key={r} value={r}>{REL_LABEL[r]}</option>))}
          </select>
          <button type="submit">Tambah relasi</button>
        </form>
      )}
      <hr />
      <button onClick={async () => { if (projectId && charId && confirm("Hapus karakter ini?")) { await api.deleteCharacter(projectId, charId); nav(`/projects/${projectId}/characters`); } }}>Hapus karakter</button>
    </main>
  );
}

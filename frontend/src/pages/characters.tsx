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
import { Badge, Button, Card, Empty, Err, Field, Icon, Input, Ok, ProjectShell, Select, Textarea } from "../components/ui";

const ROLES = Object.keys(ROLE_LABEL) as CharacterRole[];
const RELS = Object.keys(REL_LABEL) as RelationshipType[];

function RoleBadge({ role }: { role: CharacterRole }) {
  const tone = role === "protagonist" ? "ember" : role === "antagonist" ? "oxblood" : role === "minor" ? "line" : "gold";
  return <Badge tone={tone}>{ROLE_LABEL[role]}</Badge>;
}

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
      setErr("");
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
      await api.createCharacter(projectId, { name: name.trim(), role, isPlaceholder: placeholder });
      setName("");
      setPlaceholder(false);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal membuat karakter");
    }
  }

  async function remove(charId: string, charName: string) {
    if (!projectId || !confirm(`Hapus "${charName}"?`)) return;
    try {
      await api.deleteCharacter(projectId, charId);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menghapus");
    }
  }

  return (
    <ProjectShell title="Dramatis personae" meta={<Badge>{chars.length} tokoh</Badge>}>
      <p className="kicker">perpustakaan karakter</p>
      <Err message={err} />

      <Card className="mt-3 p-4">
        <form onSubmit={create} className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <Field label="Nama tokoh baru">
              <Input placeholder="cth. Larasati" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
          </div>
          <div className="md:w-44">
            <Field label="Peran">
              <Select value={role} onChange={(e) => setRole(e.target.value as CharacterRole)}>
                {ROLES.map((r) => (<option key={r} value={r}>{ROLE_LABEL[r]}</option>))}
              </Select>
            </Field>
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm text-ink-soft">
            <input type="checkbox" checked={placeholder} onChange={(e) => setPlaceholder(e.target.checked)} className="accent-[#bc4b1f]" />
            Placeholder
          </label>
          <Button variant="ink" type="submit"><Icon name="plus" /> Tambah</Button>
        </form>
      </Card>

      {chars.length === 0 ? (
        <div className="mt-4"><Empty title="Panggung masih kosong." hint="Perkenalkan tokoh pertamamu lewat formulir di atas." /></div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {chars.map((c) => (
            <Link key={c.id} to={c.id} className="group">
              <Card className="flex h-full items-start gap-4 p-4 transition-colors group-hover:border-ink-soft">
                <span className="font-display flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-line bg-paper text-xl italic">
                  {c.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="font-display block truncate text-xl font-semibold group-hover:underline group-hover:decoration-ember group-hover:underline-offset-4">
                    {c.name}
                  </span>
                  <span className="mt-1.5 flex flex-wrap gap-1.5">
                    <RoleBadge role={c.role} />
                    {c.isPlaceholder && <Badge>placeholder</Badge>}
                  </span>
                </span>
                <button
                  onClick={(e) => { e.preventDefault(); remove(c.id, c.name); }}
                  className="ml-auto rounded p-1.5 text-muted hover:bg-oxblood/10 hover:text-oxblood"
                  title="Hapus"
                >
                  <Icon name="trash" />
                </button>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </ProjectShell>
  );
}

export function CharacterDetailPage() {
  const { id: projectId, charId } = useParams<{ id: string; charId: string }>();
  const nav = useNavigate();
  const [char, setChar] = React.useState<Character | null>(null);
  const [others, setOthers] = React.useState<Character[]>([]);
  const [rels, setRels] = React.useState<{ id: string; relationshipType: RelationshipType; note: string | null; otherName: string; direction: string }[]>([]);
  const [form, setForm] = React.useState({ name: "", role: "supporting" as CharacterRole, physicalDescription: "", personalityTraits: "", backstory: "", avatarUrl: "", isPlaceholder: false });
  const [relTarget, setRelTarget] = React.useState("");
  const [relType, setRelType] = React.useState<RelationshipType>("sibling");
  const [msg, setMsg] = React.useState("");
  const [err, setErr] = React.useState("");

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
      setRels(r.relationships.map((rel) => {
        const outgoing = rel.characterId === charId;
        const otherId = outgoing ? rel.relatedCharacterId : rel.characterId;
        return {
          id: rel.id,
          relationshipType: rel.relationshipType,
          note: rel.note,
          otherName: byId.get(otherId) ?? "(dihapus)",
          direction: outgoing ? "→" : "←",
        };
      }));
      setErr("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal memuat");
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
      setMsg("Tersimpan di arsip.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menyimpan");
    }
  }

  async function addRel(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId || !charId || !relTarget) return;
    try {
      await api.createRelationship(projectId, charId, { relatedCharacterId: relTarget, relationshipType: relType });
      setRelTarget("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menambah relasi");
    }
  }

  async function delRel(relId: string) {
    if (!projectId || !charId || !confirm("Hapus relasi ini?")) return;
    await api.deleteRelationship(projectId, charId, relId);
    await load();
  }

  if (!char)
    return (
      <ProjectShell title="…">
        <Err message={err} />
        <p>Memuat…</p>
      </ProjectShell>
    );

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <ProjectShell
      title={char.name}
      meta={<><RoleBadge role={char.role} />{char.isPlaceholder && <Badge>placeholder</Badge>}</>}
    >
      <Link to=".." className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
        <Icon name="back" /> Kembali ke daftar
      </Link>
      <Err message={err} />
      <Ok message={msg} />

      <Card className="mt-3 p-5">
        <p className="kicker">biodata tokoh</p>
        <form onSubmit={save} className="mt-3 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Nama">
              <Input value={form.name} onChange={set("name")} />
            </Field>
            <Field label="Peran">
              <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as CharacterRole })}>
                {ROLES.map((r) => (<option key={r} value={r}>{ROLE_LABEL[r]}</option>))}
              </Select>
            </Field>
          </div>
          <Field label="Deskripsi fisik">
            <Textarea rows={2} value={form.physicalDescription} onChange={set("physicalDescription")} />
          </Field>
          <Field label="Sifat">
            <Textarea rows={2} value={form.personalityTraits} onChange={set("personalityTraits")} />
          </Field>
          <Field label="Latar belakang">
            <Textarea rows={3} value={form.backstory} onChange={set("backstory")} />
          </Field>
          <Field label="Avatar URL (opsional)">
            <Input value={form.avatarUrl} onChange={set("avatarUrl")} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" checked={form.isPlaceholder} onChange={(e) => setForm({ ...form, isPlaceholder: e.target.checked })} className="accent-[#bc4b1f]" />
            Tandai sebagai placeholder (belum final)
          </label>
          <Button type="submit" variant="ink">Simpan biodata</Button>
        </form>
      </Card>

      <Card className="mt-4 p-5">
        <p className="kicker">silsilah & relasi</p>
        <p className="mt-1 text-sm text-muted">Hanya relasi orang tua/anak/saudara/pasangan yang tampil di Family Tree.</p>
        <ul className="mt-3 divide-y divide-line-soft">
          {rels.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <span>{r.direction} <strong>{r.otherName}</strong> <Badge>{REL_LABEL[r.relationshipType]}</Badge></span>
              <button onClick={() => delRel(r.id)} className="rounded p-1 text-muted hover:bg-oxblood/10 hover:text-oxblood" title="Hapus relasi">
                <Icon name="x" className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
        {rels.length === 0 && <p className="mt-2 text-sm text-muted">Belum ada relasi.</p>}
        {others.length > 0 && (
          <form onSubmit={addRel} className="mt-3 flex flex-col gap-2 md:flex-row">
            <Select value={relTarget} onChange={(e) => setRelTarget(e.target.value)} className="flex-1">
              <option value="">— pilih tokoh —</option>
              {others.map((o) => (<option key={o.id} value={o.id}>{o.name}</option>))}
            </Select>
            <Select value={relType} onChange={(e) => setRelType(e.target.value as RelationshipType)} className="md:w-44">
              {RELS.map((r) => (<option key={r} value={r}>{REL_LABEL[r]}</option>))}
            </Select>
            <Button type="submit" variant="line">Tautkan</Button>
          </form>
        )}
      </Card>

      <button
        onClick={async () => { if (projectId && charId && confirm(`Hapus "${char.name}"?`)) { await api.deleteCharacter(projectId, charId); nav(".."); } }}
        className="mt-4 inline-flex items-center gap-1.5 text-sm text-oxblood hover:underline hover:underline-offset-4"
      >
        <Icon name="trash" /> Hapus tokoh ini
      </button>
    </ProjectShell>
  );
}

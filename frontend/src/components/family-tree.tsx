import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Background, Controls, MiniMap, ReactFlow, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { api, ROLE_LABEL, type Character } from "../lib/api";
import { Empty, Err } from "./ui";

type FamType = "parent" | "child" | "sibling" | "spouse";
const FAMILY: ReadonlySet<string> = new Set(["parent", "child", "sibling", "spouse"]);

/**
 * Konvensi arah (sesuai form relasi di halaman detail karakter):
 * dari halaman karakter X, user memilih Y + tipe T dengan arti "Y adalah T bagi X".
 */
function FamilyNode({ data }: { data: { name: string; role: string } & Record<string, unknown> }) {
  return (
    <div
      style={{
        border: "1.5px solid #1c1712",
        borderRadius: 999,
        background: "#fffdf7",
        padding: "10px 20px",
        textAlign: "center",
        minWidth: 140,
        cursor: "pointer",
        fontFamily: "'Space Grotesk', system-ui, sans-serif",
      }}
    >
      <div style={{ fontFamily: "Fraunces, Georgia, serif", fontWeight: 600, fontSize: 15 }}>{data.name}</div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "#bc4b1f" }}>
        {data.role}
      </div>
    </div>
  );
}

const nodeTypes = { family: FamilyNode };

export function FamilyTree({ projectId }: { projectId: string }) {
  const navigate = useNavigate();
  const [nodes, setNodes] = React.useState<Node[]>([]);
  const [edges, setEdges] = React.useState<Edge[]>([]);
  const [empty, setEmpty] = React.useState(false);
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    (async () => {
      try {
        const [ch, rel] = await Promise.all([
          api.listCharacters(projectId),
          api.listAllRelationships(projectId),
        ]);
        const fam = rel.relationships.filter((r) => FAMILY.has(r.relationshipType));
        const involved = new Set<string>();
        for (const r of fam) {
          involved.add(r.characterId);
          involved.add(r.relatedCharacterId);
        }
        const chars = ch.characters.filter((c) => involved.has(c.id));
        if (chars.length === 0) {
          setEmpty(true);
          return;
        }
        const byId = new Map<string, Character>(chars.map((c) => [c.id, c]));

        const parentLinks: [string, string][] = [];
        const peerLinks: { a: string; b: string; type: FamType }[] = [];
        for (const r of fam) {
          if (!byId.has(r.characterId) || !byId.has(r.relatedCharacterId)) continue;
          const t = r.relationshipType as FamType;
          if (t === "parent") parentLinks.push([r.relatedCharacterId, r.characterId]);
          else if (t === "child") parentLinks.push([r.characterId, r.relatedCharacterId]);
          else peerLinks.push({ a: r.characterId, b: r.relatedCharacterId, type: t });
        }

        const gen = new Map<string, number>(chars.map((c) => [c.id, 0]));
        for (let i = 0; i < chars.length + fam.length + 2; i++) {
          for (const [p, c] of parentLinks) {
            if ((gen.get(c) ?? 0) < (gen.get(p) ?? 0) + 1) gen.set(c, (gen.get(p) ?? 0) + 1);
          }
          for (const { a, b } of peerLinks) {
            const g = Math.min(gen.get(a) ?? 0, gen.get(b) ?? 0);
            gen.set(a, g);
            gen.set(b, g);
          }
        }

        const perGen = new Map<number, string[]>();
        for (const c of chars) {
          const g = gen.get(c.id) ?? 0;
          perGen.set(g, [...(perGen.get(g) ?? []), c.id]);
        }
        const pos = new Map<string, { x: number; y: number }>();
        for (const [g, ids] of perGen) {
          ids.sort((a, b) => (byId.get(a)?.name ?? "").localeCompare(byId.get(b)?.name ?? ""));
          ids.forEach((id, idx) => {
            pos.set(id, { x: idx * 230 - ((ids.length - 1) * 115), y: g * 180 });
          });
        }

        setNodes(
          chars.map((c) => ({
            id: c.id,
            type: "family",
            position: pos.get(c.id) ?? { x: 0, y: 0 },
            data: { name: c.name, role: ROLE_LABEL[c.role] },
          })),
        );
        setEdges([
          ...parentLinks.map(([p, c], i) => ({
            id: `p${i}-${p}-${c}`,
            source: p,
            target: c,
            type: "smoothstep" as const,
          })),
          ...peerLinks.map(({ a, b, type }, i) => ({
            id: `s${i}-${a}-${b}`,
            source: a,
            target: b,
            label: type === "spouse" ? "pasangan" : "saudara",
            style: { strokeDasharray: "6 4" },
          })),
        ]);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Gagal memuat family tree");
      }
    })();
  }, [projectId]);

  if (err) return <div className="p-4"><Err message={err} /></div>;
  if (empty)
    return (
      <div className="p-4">
        <Empty
          title="Belum ada silsilah."
          hint="Tautkan relasi keluarga antar tokoh — pohonnya tumbuh sendiri di sini."
        >
          <Link to={`/projects/${projectId}/characters`} className="text-sm font-medium text-ember-deep underline underline-offset-4">
            Buka perpustakaan karakter
          </Link>
        </Empty>
      </div>
    );

  return (
    <div className="p-4">
      <p className="mb-3 max-w-2xl text-sm text-ink-soft">
        Tumbuh otomatis dari relasi orang tua, anak, saudara, dan pasangan. Klik nama untuk membuka lembar tokohnya.
      </p>
      <div className="xy-theme-novel h-[520px] overflow-hidden rounded-md border border-line">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={(_, n) => navigate(`/projects/${projectId}/characters/${n.id}`)}
          fitView
        >
          <Background color="#d8cdae" gap={24} size={1} />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </div>
  );
}

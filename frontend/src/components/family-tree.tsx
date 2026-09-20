import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { api, ROLE_LABEL, type Character } from "../lib/api";

type FamType = "parent" | "child" | "sibling" | "spouse";
const FAMILY: ReadonlySet<string> = new Set(["parent", "child", "sibling", "spouse"]);

/**
 * Konvensi arah (sesuai form relasi di halaman detail karakter):
 * dari halaman karakter X, user memilih Y + tipe T dengan arti "Y adalah T bagi X".
 * - T=parent  → Y orang tua X  (edge Y→X)
 * - T=child   → Y anak X       (edge X→Y)
 * - T=sibling/spouse → satu generasi (edge putus-putus)
 */
function FamilyNode({ data }: { data: { name: string; role: string } & Record<string, unknown> }) {
  return (
    <div
      style={{
        border: "2px solid #333",
        borderRadius: 999,
        background: "#fff",
        padding: "10px 18px",
        textAlign: "center",
        minWidth: 130,
        cursor: "pointer",
      }}
    >
      <div style={{ fontWeight: "bold" }}>{data.name}</div>
      <div style={{ fontSize: 12, color: "#666" }}>{data.role}</div>
    </div>
  );
}

const nodeTypes = { family: FamilyNode };

export function FamilyTree({ projectId }: { projectId: string }) {
  const nav = useNavigate();
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

        // Bangun edge orangtua→anak + tautan se-generasi.
        const parentLinks: [string, string][] = []; // [parent, child]
        const peerLinks: { a: string; b: string; type: FamType }[] = [];
        for (const r of fam) {
          if (!byId.has(r.characterId) || !byId.has(r.relatedCharacterId)) continue;
          const t = r.relationshipType as FamType;
          if (t === "parent") parentLinks.push([r.relatedCharacterId, r.characterId]);
          else if (t === "child") parentLinks.push([r.characterId, r.relatedCharacterId]);
          else peerLinks.push({ a: r.characterId, b: r.relatedCharacterId, type: t });
        }

        // Generasi: fixpoint sederhana (asumsi tidak ada siklus).
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

        // X per generasi (urut nama, rata tengah).
        const perGen = new Map<number, string[]>();
        for (const c of chars) {
          const g = gen.get(c.id) ?? 0;
          perGen.set(g, [...(perGen.get(g) ?? []), c.id]);
        }
        const pos = new Map<string, { x: number; y: number }>();
        for (const [g, ids] of perGen) {
          ids.sort((a, b) => (byId.get(a)?.name ?? "").localeCompare(byId.get(b)?.name ?? ""));
          ids.forEach((id, idx) => {
            pos.set(id, { x: idx * 220 - ((ids.length - 1) * 110), y: g * 180 });
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
        const flowEdges: Edge[] = [
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
        ];
        setEdges(flowEdges);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Gagal memuat family tree");
      }
    })();
  }, [projectId]);

  if (err) return <p style={{ color: "crimson" }}>{err}</p>;
  if (empty)
    return (
      <div>
        <p>Belum ada relasi keluarga di project ini.</p>
        <p>Tambahkan lewat <Link to={`/projects/${projectId}/characters`}>Perpustakaan Karakter</Link> → detail karakter → “Relasi keluarga”.</p>
      </div>
    );

  return (
    <div>
      <p style={{ fontSize: 13, color: "#666" }}>
        Dibangun otomatis dari relasi bertipe orang tua/anak/saudara/pasangan (PRD §3.6.2).
        Klik node untuk membuka halaman edit karakter.
      </p>
      <div style={{ height: 520, border: "1px solid #ccc", borderRadius: 8 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={(_, n) => nav(`/projects/${projectId}/characters/${n.id}`)}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </div>
  );
}

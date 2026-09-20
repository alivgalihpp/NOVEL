import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import "./index.css";
import { RequireAuth } from "./components/auth";
import { Login, Register } from "./pages/auth-pages";
import { Dashboard } from "./pages/dashboard";
import { ProjectDetail } from "./pages/project-detail";
import { CharacterDetailPage, CharactersPage } from "./pages/characters";
import { PlaceDetailPage, PlacesPage } from "./pages/places";
import { RoadmapPage } from "./pages/roadmap";
import { WritePage } from "./pages/write";
import { SettingsPage } from "./pages/settings";
import { PreviewPage } from "./pages/preview";
import { getToken } from "./lib/api";
import { Button, Icon, TopBar } from "./components/ui";

const CONTENTS: [string, string][] = [
  ["I", "Perpustakaan karakter & relasi keluarga"],
  ["II", "Perpustakaan tempat"],
  ["III", "Roadmap bab: daftar & diagram"],
  ["IV", "Ruang menulis + word count"],
  ["V", "Asisten AI: roadmap & isi bab"],
  ["VI", "Preview buku & cover"],
];

function Home() {
  const [health, setHealth] = React.useState("…");
  React.useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((j) => setHealth(j.ok ? "mesin kata daring" : "mesin kata luring"))
      .catch(() => setHealth("mesin kata luring"));
  }, []);
  const authed = Boolean(getToken());

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar
        right={
          authed ? (
            <Link to="/dashboard">
              <Button variant="primary">Buka meja kerja</Button>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="rounded-md px-3 py-2 text-sm text-paper/80 hover:bg-white/10 hover:text-paper">
                Masuk
              </Link>
              <Link to="/register">
                <Button variant="primary">Mulai menulis</Button>
              </Link>
            </div>
          )
        }
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-5">
        <div className="grid gap-10 py-14 md:grid-cols-[1.2fr_0.8fr] md:py-20">
          <div>
            <p className="kicker">NovelCraft · no. 01 — ruang kerja novel</p>
            <h1 className="font-display mt-4 text-5xl leading-[1.02] font-semibold tracking-tight md:text-7xl">
              Satu meja untuk <em className="text-ember">seluruh</em> novelmu.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
              Tokoh, tempat, alur bab, dan draf — tersusun seperti naskah sungguhan,
              bukan tumpukan dokumen lepas. AI boleh membantu, kamu yang memutuskan.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {authed ? (
                <Link to="/dashboard">
                  <Button variant="primary">Buka meja kerja <Icon name="back" className="h-4 w-4 rotate-180" /></Button>
                </Link>
              ) : (
                <>
                  <Link to="/register">
                    <Button variant="primary">Mulai menulis — gratis <Icon name="back" className="h-4 w-4 rotate-180" /></Button>
                  </Link>
                  <Link to="/login">
                    <Button variant="line">Saya sudah punya akun</Button>
                  </Link>
                </>
              )}
            </div>
            <p className="mt-6 font-mono text-xs text-muted">● {health}</p>
          </div>

          <aside className="rounded-lg border border-line bg-card p-6">
            <p className="kicker">Daftar isi</p>
            <ol className="mt-3 divide-y divide-line-soft">
              {CONTENTS.map(([no, label]) => (
                <li key={no} className="flex items-baseline gap-3 py-2.5">
                  <span className="font-display text-lg text-ember italic">{no}</span>
                  <span className="text-sm text-ink">{label}</span>
                </li>
              ))}
            </ol>
            <div className="rule-double mt-4 pt-4">
              <p className="text-sm leading-relaxed text-ink-soft">
                “Semua hasil AI adalah draf yang bisa diedit total — bukan vonis final.”
              </p>
              <p className="kicker mt-2">— prinsip no. 1 NovelCraft</p>
            </div>
          </aside>
        </div>

        <div className="grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-3">
          {[
            ["Jangan kehilangan tokoh", "Sifat, fisik, dan silsilah setiap karakter tercatat dan saling terhubung."],
            ["Alur yang tak berlubang", "Bab tersusun sebagai peta — tambah, sambung, atau tandai plot twist."],
            ["Draf saat macet", "GeneratorAI menulis draf dari ringkasanmu. Kamu tetap editornya."],
          ].map(([t, d]) => (
            <div key={t} className="bg-card p-6">
              <h3 className="font-display text-xl font-semibold">{t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{d}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-5 py-8">
        <div className="flex items-center justify-between border-t border-line pt-4">
          <p className="font-display text-sm italic">NovelCraft — disusun dengan teliti.</p>
          <p className="font-mono text-[11px] tracking-[0.18em] text-muted uppercase">kolofon · 2026</p>
        </div>
      </footer>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/projects/:id" element={<RequireAuth><ProjectDetail /></RequireAuth>} />
        <Route path="/projects/:id/characters" element={<RequireAuth><CharactersPage /></RequireAuth>} />
        <Route path="/projects/:id/characters/:charId" element={<RequireAuth><CharacterDetailPage /></RequireAuth>} />
        <Route path="/projects/:id/places" element={<RequireAuth><PlacesPage /></RequireAuth>} />
        <Route path="/projects/:id/places/:placeId" element={<RequireAuth><PlaceDetailPage /></RequireAuth>} />
        <Route path="/projects/:id/roadmap" element={<RequireAuth><RoadmapPage /></RequireAuth>} />
        <Route path="/projects/:id/write" element={<RequireAuth><WritePage /></RequireAuth>} />
        <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
        <Route path="/projects/:id/preview" element={<RequireAuth><PreviewPage /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);

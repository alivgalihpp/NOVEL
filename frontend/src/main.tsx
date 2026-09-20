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

const TOC: [string, string][] = [
  ["I", "Perpustakaan karakter & silsilah yang hidup"],
  ["II", "Atlas tempat — geografi ceritamu"],
  ["III", "Peta alur bab: daftar & diagram interaktif"],
  ["IV", "Ruang menulis yang fokus & hemat mata"],
  ["V", "Asisten AI: dari kerangka hingga draf bab"],
  ["VI", "Cetak percobaan & sampul buku"],
];

function Home() {
  const [health, setHealth] = React.useState("…");
  React.useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((j) => setHealth(j.ok ? "mesin kata • daring" : "mesin kata • luring"))
      .catch(() => setHealth("mesin kata • luring"));
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
              <Link
                to="/login"
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-ink-soft hover:bg-surface hover:text-ink"
              >
                Masuk
              </Link>
              <Link to="/register">
                <Button variant="primary">Mulai menulis</Button>
              </Link>
            </div>
          )
        }
      />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6">
        <div className="grid gap-10 py-14 md:grid-cols-[1.25fr_0.75fr] md:py-20">
          <div>
            <p className="kicker">NovelCraft · studio penulisan modern</p>
            <h1 className="font-display mt-4 text-5xl leading-[0.98] font-semibold tracking-tight md:text-7xl">
              Studio gelap
              <br />
              untuk <em className="font-normal not-italic text-accent">cerita panjang.</em>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
              Tokoh, tempat, peta alur, dan draf — satu meja yang hemat mata.
              AI membantu saat buntu, kamu yang memutuskan nada akhir.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {authed ? (
                <Link to="/dashboard">
                  <Button variant="primary">
                    Buka meja kerja <Icon name="back" className="h-4 w-4 rotate-180" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/register">
                    <Button variant="primary">
                      Mulai menulis — gratis <Icon name="back" className="h-4 w-4 rotate-180" />
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button variant="surface">Saya sudah punya akun</Button>
                  </Link>
                </>
              )}
            </div>
            <p className="mt-7 font-mono text-xs text-ink-soft">● {health}</p>
          </div>

          <aside className="rounded-2xl border border-border bg-card p-6">
            <p className="kicker">daftar isi plat</p>
            <ol className="mt-3 divide-y divide-border">
              {TOC.map(([no, label]) => (
                <li key={no} className="flex items-baseline gap-3 py-2.5">
                  <span className="font-display text-lg font-semibold text-accent">{no}</span>
                  <span className="text-sm text-ink">{label}</span>
                </li>
              ))}
            </ol>
            <div className="mt-4 rounded-xl border border-accent/20 bg-accent/10 p-4">
              <p className="text-sm leading-relaxed text-ink">
                “Semua hasil AI adalah draf yang bisa diedit total.”
              </p>
              <p className="kicker mt-2 text-accent">— prinsip no. 1</p>
            </div>
          </aside>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Jangan kehilangan tokoh", "Sifat, fisik, dan silsilah setiap karakter tercatat dan saling terhubung — pohon keluarga tumbuh sendiri."],
            ["Alur yang tak berlubang", "Bab tersusun sebagai peta yang bisa ditata ulang. Geser, sambung, tandai twist."],
            ["Draf saat macet", "GeneratorAI menulis dari ringkasanmu dengan konteks bab sebelumnya. Kamu tetap editornya."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-display text-xl font-semibold">{t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{d}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="mx-auto w-full max-w-7xl px-6 py-8">
        <div className="flex items-center justify-between border-t border-border pt-4">
          <p className="font-display text-sm italic text-ink-soft">NovelCraft — kegelapan yang ramah mata.</p>
          <p className="kicker">kolofon · 2026</p>
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

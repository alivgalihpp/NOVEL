import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";

function useHealth() {
  const [health, setHealth] = React.useState<string>("mengecek backend...");
  React.useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((j) => setHealth(j.ok ? `OK (${j.time})` : "tidak OK"))
      .catch(() => setHealth("backend belum jalan (bun run dev:backend)"));
  }, []);
  return health;
}

function Home() {
  const health = useHealth();
  return (
    <main style={{ fontFamily: "system-ui", maxWidth: 720, margin: "40px auto", padding: 24 }}>
      <h1>NovelCraft — Tahap 0</h1>
      <p>Platform Penulisan Novel Berbantuan AI. Scaffolding: Bun + Elysia + MySQL + React.</p>
      <p>
        Status backend: <code>{health}</code>
      </p>
      <nav style={{ display: "flex", gap: 12 }}>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/login">Login</Link>
      </nav>
      <h3>Fase berikutnya (PRD §9)</h3>
      <ol>
        <li>Auth + dashboard + CRUD project manual</li>
        <li>Karakter &amp; Tempat CRUD</li>
        <li>Roadmap list + status bab</li>
        <li>Roadmap diagram + Family Tree</li>
        <li>Menulis manual, dst.</li>
      </ol>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Home />} />
        <Route path="/login" element={<Home />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);

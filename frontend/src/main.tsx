import React from "react";
import ReactDOM from "react-dom/client";
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import { RequireAuth, box } from "./components/auth";
import { Login, Register } from "./pages/auth-pages";
import { Dashboard } from "./pages/dashboard";
import { ProjectDetail } from "./pages/project-detail";
import { CharacterDetailPage, CharactersPage } from "./pages/characters";
import { PlaceDetailPage, PlacesPage } from "./pages/places";
import { RoadmapPage } from "./pages/roadmap";
import { getToken } from "./lib/api";

function Home() {
  const [health, setHealth] = React.useState("mengecek backend...");
  React.useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((j) => setHealth(j.ok ? `OK (${j.time})` : "tidak OK"))
      .catch(() => setHealth("backend belum jalan (bun run dev:backend)"));
  }, []);
  return (
    <main style={box}>
      <h1>NovelCraft</h1>
      <p>Platform Penulisan Novel Berbantuan AI.</p>
      <p>
        Status backend: <code>{health}</code>
      </p>
      <nav style={{ display: "flex", gap: 12 }}>
        {getToken() ? (
          <Link to="/dashboard">Dashboard</Link>
        ) : (
          <>
            <Link to="/login">Masuk</Link>
            <Link to="/register">Daftar</Link>
          </>
        )}
      </nav>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/projects/:id"
          element={
            <RequireAuth>
              <ProjectDetail />
            </RequireAuth>
          }
        />
        <Route
          path="/projects/:id/characters"
          element={
            <RequireAuth>
              <CharactersPage />
            </RequireAuth>
          }
        />
        <Route
          path="/projects/:id/characters/:charId"
          element={
            <RequireAuth>
              <CharacterDetailPage />
            </RequireAuth>
          }
        />
        <Route
          path="/projects/:id/places"
          element={
            <RequireAuth>
              <PlacesPage />
            </RequireAuth>
          }
        />
        <Route
          path="/projects/:id/places/:placeId"
          element={
            <RequireAuth>
              <PlaceDetailPage />
            </RequireAuth>
          }
        />
        <Route
          path="/projects/:id/roadmap"
          element={
            <RequireAuth>
              <RoadmapPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);

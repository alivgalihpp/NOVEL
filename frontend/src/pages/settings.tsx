import React from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { box, input } from "../components/auth";

type Provider = "mock" | "openai_compatible";

const PRESETS: Record<string, { baseUrl: string; model: string }> = {
  "OpenAI": { baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  "Ollama (lokal)": { baseUrl: "http://localhost:11434/v1", model: "llama3.1" },
  "LM Studio (lokal)": { baseUrl: "http://localhost:1234/v1", model: "local-model" },
  "Google Gemini": { baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-2.0-flash" },
};

export function SettingsPage() {
  const [provider, setProvider] = React.useState<Provider>("mock");
  const [apiKey, setApiKey] = React.useState("");
  const [baseUrl, setBaseUrl] = React.useState(PRESETS["OpenAI"].baseUrl);
  const [model, setModel] = React.useState(PRESETS["OpenAI"].model);
  const [hasKey, setHasKey] = React.useState(false);
  const [effective, setEffective] = React.useState("");
  const [msg, setMsg] = React.useState("");

  async function load() {
    try {
      const res = await api.getAiSettings();
      setProvider(res.settings.provider);
      setHasKey(res.settings.hasKey);
      if (res.settings.baseUrl) setBaseUrl(res.settings.baseUrl);
      if (res.settings.model) setModel(res.settings.model);
      setEffective(res.settings.effective);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Gagal memuat pengaturan");
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await api.updateAiSettings({
        provider,
        apiKey: provider === "openai_compatible" ? apiKey : undefined,
        baseUrl: provider === "openai_compatible" ? baseUrl.trim() || undefined : undefined,
        model: provider === "openai_compatible" ? model.trim() || undefined : undefined,
      });
      setApiKey("");
      setEffective(res.effective);
      await load();
      setMsg("Tersimpan.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Gagal menyimpan");
    }
  }

  async function removeKey() {
    if (!confirm("Hapus kunci tersimpan?")) return;
    await api.deleteAiKey();
    await load();
  }

  function applyPreset(name: string) {
    setBaseUrl(PRESETS[name].baseUrl);
    setModel(PRESETS[name].model);
  }

  return (
    <main style={box}>
      <Link to="/dashboard">← Dashboard</Link>
      <h1>Pengaturan AI</h1>
      <p>
        Sumber aktif saat ini: <strong>{effective === "user" ? "kunci milikmu" : effective === "server" ? "kunci server" : "Mock (tanpa kunci)"}</strong>
      </p>
      <p style={{ fontSize: 14, color: "#666" }}>
        Urutan pakai: kunci milikmu → kunci server (.env) → Mock. Kunci milikmu disimpan
        terenkripsi (AES-GCM) dan tidak pernah ditampilkan lagi setelah disimpan.
      </p>
      <form onSubmit={save}>
        <label>Provider</label>
        <select style={input} value={provider} onChange={(e) => setProvider(e.target.value as Provider)}>
          <option value="mock">Mock — tanpa kunci (cocok untuk lokal/dev)</option>
          <option value="openai_compatible">Kunci sendiri (OpenAI-compatible)</option>
        </select>
        {provider === "openai_compatible" && (
          <>
            <label>Preset</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              {Object.keys(PRESETS).map((p) => (
                <button type="button" key={p} onClick={() => applyPreset(p)}>{p}</button>
              ))}
            </div>
            <label>API key {hasKey && "(sudah tersimpan — isi lagi hanya bila ingin mengganti)"}</label>
            <input style={input} type="password" placeholder={hasKey ? "••••••••" : "sk-..."} value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
            <label>Base URL</label>
            <input style={input} value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
            <label>Model</label>
            <input style={input} value={model} onChange={(e) => setModel(e.target.value)} />
          </>
        )}
        <button type="submit">Simpan</button>{" "}
        {hasKey && provider === "openai_compatible" && (
          <button type="button" onClick={removeKey}>Hapus kunci</button>
        )}
      </form>
      {msg && <p>{msg}</p>}
    </main>
  );
}

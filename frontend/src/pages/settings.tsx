import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, setToken } from "../lib/api";
import { Button, Card, Err, Field, Input, Ok, Page, Select } from "../components/ui";

type Provider = "mock" | "openai_compatible";

const PRESETS: Record<string, { baseUrl: string; model: string }> = {
  "Cloudflare (kamu)": { baseUrl: "https://elizabeth-waterproof-plant-screenshot.trycloudflare.com", model: "Combomaut" },
  "9router": { baseUrl: "https://api.9router.com/v1", model: "Combomaut" },
  "OpenAI": { baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  "Ollama (lokal)": { baseUrl: "http://localhost:11434/v1", model: "llama3.1" },
  "LM Studio (lokal)": { baseUrl: "http://localhost:1234/v1", model: "local-model" },
  "Google Gemini": { baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-2.0-flash" },
};

export function SettingsPage() {
  const [provider, setProvider] = React.useState<Provider>("mock");
  const [apiKey, setApiKey] = React.useState("");
  const [baseUrl, setBaseUrl] = React.useState(PRESETS["Cloudflare (kamu)"].baseUrl);
  const [model, setModel] = React.useState(PRESETS["Cloudflare (kamu)"].model);
  const [hasKey, setHasKey] = React.useState(false);
  const [effective, setEffective] = React.useState("");
  const [msg, setMsg] = React.useState("");
  const [err, setErr] = React.useState("");

  async function load() {
    try {
      const res = await api.getAiSettings();
      setProvider(res.settings.provider);
      setHasKey(res.settings.hasKey);
      if (res.settings.baseUrl) setBaseUrl(res.settings.baseUrl);
      if (res.settings.model) setModel(res.settings.model);
      setEffective(res.settings.effective);
      setErr("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal memuat pengaturan");
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
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
      setMsg("Pengaturan tersimpan.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menyimpan");
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

  const effectiveLabel =
    effective === "user" ? "kunci milikmu" : effective === "server" ? "kunci server" : "Mock (tanpa kunci)";

  return (
    <Page>
      <Link to="/dashboard" className="text-sm text-ink-soft hover:text-ink">← Dashboard</Link>
      <p className="kicker mt-2">pengaturan</p>
      <h1 className="font-display mt-1 text-4xl font-semibold">Ruang mesin</h1>

      <Card className="mt-5 p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-display text-2xl font-semibold">Kecerdasan buatan</h2>
          <span className="font-mono text-xs text-muted">aktif: {effectiveLabel}</span>
        </div>
        <p className="mt-1 text-sm text-ink-soft">
          Urutan pakai: kunci milikmu → kunci server → Mock. Kunci disimpan terenkripsi dan tak pernah ditampilkan lagi.
        </p>
        <form onSubmit={save} className="mt-4 space-y-3">
          <Field label="Provider">
            <Select value={provider} onChange={(e) => setProvider(e.target.value as Provider)}>
              <option value="mock">Mock — tanpa kunci, untuk lokal</option>
              <option value="openai_compatible">Kunci sendiri (OpenAI-compatible)</option>
            </Select>
          </Field>
          {provider === "openai_compatible" && (
            <>
              <div>
                <span className="kicker mb-1 block">Preset</span>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(PRESETS).map((p) => (
                    <Button key={p} type="button" variant={p === "Cloudflare (kamu)" ? "primary" : "ghost"} onClick={() => applyPreset(p)}>{p}</Button>
                  ))}
                </div>
              </div>
              <Field label={hasKey ? "API key (tersimpan — isi bila ingin mengganti)" : "API key"}>
                <Input type="password" placeholder={hasKey ? "••••••••" : "sk-…"} value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
              </Field>
              <Field label="Base URL">
                <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
              </Field>
              <Field label="Model">
                <Input value={model} onChange={(e) => setModel(e.target.value)} />
              </Field>
            </>
          )}
          <div className="flex gap-2">
            <Button type="submit" variant="ink">Simpan</Button>
            {hasKey && provider === "openai_compatible" && (
              <Button type="button" variant="ghost" onClick={removeKey}>Hapus kunci</Button>
            )}
          </div>
        </form>
        <Ok message={msg} />
        <Err message={err} />
      </Card>

      <DangerZone />
    </Page>
  );
}

function DangerZone() {
  const nav = useNavigate();
  const [password, setPassword] = React.useState("");
  const [msg, setMsg] = React.useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm("Hapus akun BESERTA SELURUH project dan datanya? Tidak bisa dibatalkan!")) return;
    if (!confirm("Yakin? Ini penghapusan permanen.")) return;
    try {
      await api.deleteAccount(password);
      setToken(null);
      nav("/register");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Gagal menghapus akun");
    }
  }

  return (
    <Card className="mt-4 border-oxblood/60 p-5">
      <h2 className="font-display text-2xl font-semibold text-oxblood">Zona berbahaya</h2>
      <p className="mt-1 text-sm text-ink-soft">Hapus akun beserta seluruh project, tokoh, bab, dan kunci AI.</p>
      <form onSubmit={submit} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Input type="password" placeholder="Konfirmasi password" value={password} onChange={(e) => setPassword(e.target.value)} className="flex-1" />
        <Button type="submit" variant="danger">Hapus permanen</Button>
      </form>
      <Err message={msg} />
    </Card>
  );
}

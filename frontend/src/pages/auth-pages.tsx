import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, setToken } from "../lib/api";
import { Button, Err, Field, Input, TopBar } from "../components/ui";

function Shell({ title, kicker, children }: { title: string; kicker: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <TopBar />
      <main className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-10 px-6 py-12 md:grid-cols-[1fr_1fr]">
        <div className="hidden md:block space-y-4">
          <p className="kicker">{kicker}</p>
          <h1 className="font-display text-5xl leading-tight font-bold text-ink">{title}</h1>
          <p className="text-ink-soft text-base leading-relaxed">
            “Menulis adalah menyusun kembali dunia dalam kepala ke atas lembar-lembar sunyi.”
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-8 shadow-xl">{children}</div>
      </main>
    </div>
  );
}

export function Login() {
  const nav = useNavigate();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [err, setErr] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const res = await api.login({ email, password });
      setToken(res.token);
      nav("/dashboard");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Login gagal");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell title="Selamat kembali." kicker="masuk · no. 02">
      <h2 className="font-display text-2xl font-semibold md:hidden">Selamat kembali.</h2>
      <form onSubmit={submit} className="mt-2 space-y-4 md:mt-0">
        <Field label="Email">
          <Input placeholder="penulis@contoh.id" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password">
          <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Err message={err} />
        <Button variant="primary" className="w-full justify-center" disabled={busy}>
          {busy ? "Membuka…" : "Masuk ke meja kerja"}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-ink-soft">
        Belum punya akun?{" "}
        <Link to="/register" className="font-semibold text-accent hover:underline">
          Daftar di sini
        </Link>
      </p>
    </Shell>
  );
}

export function Register() {
  const nav = useNavigate();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");
  const [err, setErr] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const res = await api.register({ email, password, displayName });
      setToken(res.token);
      nav("/dashboard");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Registrasi gagal");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell title="Bab pertama dimulai." kicker="daftar · no. 03">
      <h2 className="font-display text-2xl font-semibold md:hidden">Bab pertama dimulai.</h2>
      <form onSubmit={submit} className="mt-2 space-y-4 md:mt-0">
        <Field label="Nama pena">
          <Input placeholder="S. Merpati" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </Field>
        <Field label="Email">
          <Input placeholder="penulis@contoh.id" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password — min. 8 karakter">
          <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Err message={err} />
        <Button variant="primary" className="w-full justify-center" disabled={busy}>
          {busy ? "Menyiapkan meja…" : "Daftarkan saya"}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-ink-soft">
        Sudah punya akun?{" "}
        <Link to="/login" className="font-semibold text-accent hover:underline">
          Masuk
        </Link>
      </p>
    </Shell>
  );
}

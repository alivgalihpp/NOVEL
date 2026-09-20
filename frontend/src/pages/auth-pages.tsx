import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, setToken } from "../lib/api";
import { box, input } from "../components/auth";

export function Login() {
  const nav = useNavigate();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [err, setErr] = React.useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      const res = await api.login({ email, password });
      setToken(res.token);
      nav("/dashboard");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Login gagal");
    }
  }

  return (
    <main style={box}>
      <h1>Masuk NovelCraft</h1>
      <form onSubmit={submit}>
        <input style={input} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input style={input} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {err && <p style={{ color: "crimson" }}>{err}</p>}
        <button type="submit">Masuk</button>
      </form>
      <p>
        Belum punya akun? <Link to="/register">Daftar</Link>
      </p>
    </main>
  );
}

export function Register() {
  const nav = useNavigate();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");
  const [err, setErr] = React.useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      const res = await api.register({ email, password, displayName });
      setToken(res.token);
      nav("/dashboard");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Registrasi gagal");
    }
  }

  return (
    <main style={box}>
      <h1>Daftar NovelCraft</h1>
      <form onSubmit={submit}>
        <input style={input} placeholder="Nama tampilan" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        <input style={input} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input style={input} type="password" placeholder="Password (min. 8 karakter)" value={password} onChange={(e) => setPassword(e.target.value)} />
        {err && <p style={{ color: "crimson" }}>{err}</p>}
        <button type="submit">Daftar</button>
      </form>
      <p>
        Sudah punya akun? <Link to="/login">Masuk</Link>
      </p>
    </main>
  );
}

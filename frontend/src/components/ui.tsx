import React from "react";
import { Link, NavLink, useParams } from "react-router-dom";

const paths: Record<string, React.ReactNode> = {
  book: <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5V5.5Z M4 20.5A2.5 2.5 0 0 1 6.5 18H20" />,
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19c.6-3 2.8-4.5 5.5-4.5s4.9 1.5 5.5 4.5 M15.5 5.4a3.2 3.2 0 0 1 0 5.6 M17.5 14.9c1.6.7 2.7 2 3 4.1" /></>,
  pin: <><path d="M12 21s-6.5-5.4-6.5-10.4A6.5 6.5 0 0 1 12 4a6.5 6.5 0 0 1 6.5 6.6C18.5 15.6 12 21 12 21Z" /><circle cx="12" cy="10.5" r="2.2" /></>,
  pen: <path d="M14.5 5.5 18.5 9.5 8 20l-4.5 1L4.5 16.5 14.5 5.5Z M13 7l4 4" />,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.8" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 2.8v2.6M12 18.6v2.6M4.2 7.2l2.2 1.4M17.6 15.4l2.2 1.4M2.8 12h2.6M18.6 12h2.6M4.2 16.8l2.2-1.4M17.6 8.6l2.2-1.4" /></>,
  flow: <><circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="12" cy="18" r="2.5" /><path d="M8.5 6h7M7 8.2l3.6 7.3M17 8.2l-3.6 7.3" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  trash: <path d="M4 7h16M9 7V5h6v2M6.5 7l1 13h9l1-13M10 11v6M14 11v6" />,
  back: <path d="M19 12H5M11 6l-6 6 6 6" />,
  spark: <path d="M12 3v6M12 15v6M3 12h6M15 12h6M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3" />,
  home: <path d="M4 11 12 4l8 7M6 9.5V20h12V9.5" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="M4.5 12.5 10 18 19.5 6.5" />,
};

export function Icon({ name, className = "h-4 w-4" }: { name: keyof typeof paths; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {paths[name]}
    </svg>
  );
}

type BtnVariant = "primary" | "surface" | "ghost" | "danger" | "ink" | "line";

const btnBase =
  "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 select-none shadow-sm active:scale-95";

const btnVariant: Record<BtnVariant, string> = {
  primary: "bg-accent text-card hover:bg-accent-hover shadow-accent/20",
  surface: "bg-surface text-ink hover:bg-[#e2d7c3] border border-border",
  ghost: "text-ink-soft hover:bg-surface hover:text-ink shadow-none",
  danger: "bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 border border-rose-500/20 shadow-none",
  ink: "bg-ink text-card hover:bg-black",
  line: "bg-surface text-ink hover:bg-[#e2d7c3] border border-border",
};

export function Button({
  variant = "surface",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  return <button className={`${btnBase} ${btnVariant[variant]} ${className}`} {...props} />;
}

const fieldCls =
  "block w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all";

export function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="kicker mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldCls} ${props.className ?? ""}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${fieldCls} ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${fieldCls} ${props.className ?? ""}`} />;
}

export function Badge({ tone = "surface", children }: { tone?: "surface" | "accent" | "danger" | "warning" | "ember" | "oxblood" | "moss" | "gold" | "line" | "ink"; children: React.ReactNode }) {
  const tones: Record<string, string> = {
    surface: "border-border bg-surface text-ink-soft",
    accent: "border-accent/40 bg-accent/10 text-accent",
    danger: "border-rose-500/30 bg-rose-500/10 text-rose-400",
    warning: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    ember: "border-accent/40 bg-accent/10 text-accent",
    oxblood: "border-rose-500/30 bg-rose-500/10 text-rose-400",
    moss: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    gold: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    line: "border-border bg-surface text-ink-soft",
    ink: "border-ink bg-ink text-bg",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-medium tracking-wide ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function Empty({ title, hint, children }: { title: string; hint?: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-12 text-center">
      <p className="font-display text-2xl font-medium">{title}</p>
      {hint && <p className="mt-1.5 text-sm text-ink-soft">{hint}</p>}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}

export function Err({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
      {message}
    </div>
  );
}

export function Ok({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
      {message}
    </div>
  );
}

export function TopBar({ right }: { right?: React.ReactNode }) {
  return (
    <header className="glass sticky top-0 z-50 border-b border-border">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-slate-950 font-display font-bold text-lg shadow-md shadow-accent/20 group-hover:scale-105 transition-transform">
            N
          </div>
          <span className="font-display text-lg font-semibold tracking-wide text-ink">NovelCraft</span>
        </Link>
        <div className="flex items-center gap-3">{right}</div>
      </div>
    </header>
  );
}

const navItems = [
  { to: "", label: "Ringkasan", icon: "home" as const },
  { to: "roadmap", label: "Roadmap", icon: "flow" as const },
  { to: "characters", label: "Karakter", icon: "users" as const },
  { to: "places", label: "Tempat", icon: "pin" as const },
  { to: "write", label: "Menulis", icon: "pen" as const },
  { to: "preview", label: "Preview", icon: "eye" as const },
];

export function ProjectShell({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="min-h-screen bg-bg">
      <TopBar
        right={
          <Link to="/dashboard">
            <Button variant="surface">
              <Icon name="back" /> Dashboard
            </Button>
          </Link>
        }
      />
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8 md:flex-row">
        <aside className="shrink-0 md:w-64">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="kicker">Studio Project</p>
            <h2 className="font-display mt-2 text-2xl font-bold tracking-tight text-ink">{title}</h2>
            {meta && <div className="mt-3 flex flex-wrap gap-2">{meta}</div>}
          </div>
          <nav className="mt-4 flex flex-col gap-1.5">
            {navItems.map((n) => (
              <NavLink
                key={n.to}
                to={n.to === "" ? `/projects/${id}` : `/projects/${id}/${n.to}`}
                end={n.to === ""}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-accent text-slate-950 font-semibold shadow-md shadow-accent/10"
                      : "text-ink-soft hover:bg-surface hover:text-ink"
                  }`
                }
              >
                <Icon name={n.icon} />
                {n.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

export function Page({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen bg-bg">
      <TopBar />
      <main className={`mx-auto px-6 py-12 ${wide ? "max-w-6xl" : "max-w-xl"}`}>{children}</main>
    </div>
  );
}

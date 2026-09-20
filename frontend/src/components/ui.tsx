import React from "react";
import { Link, NavLink, useParams } from "react-router-dom";

/* ---------- Ikon garis tipis (SVG inline, tanpa emoji) ---------- */

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
  doc: <path d="M6 3h8l4 4v14H6V3Z M14 3v4h4 M9 12h6M9 16h6" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="M4.5 12.5 10 18 19.5 6.5" />,
};

export function Icon({ name, className = "h-4 w-4" }: { name: keyof typeof paths; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {paths[name]}
    </svg>
  );
}

/* ---------- Tombol ---------- */

type BtnVariant = "primary" | "ink" | "ghost" | "line" | "danger";

const btnBase =
  "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50";

const btnVariant: Record<BtnVariant, string> = {
  primary: "bg-ember text-[#fff8ee] hover:bg-ember-deep",
  ink: "bg-ink text-paper hover:bg-black",
  ghost: "text-ink-soft hover:bg-paper-deep hover:text-ink",
  line: "border border-line bg-card text-ink hover:border-ink-soft",
  danger: "bg-oxblood text-[#fff8ee] hover:brightness-110",
};

export function Button({
  variant = "line",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  return <button className={`${btnBase} ${btnVariant[variant]} ${className}`} {...props} />;
}

/* ---------- Form ---------- */

const fieldCls =
  "block w-full rounded-md border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-ember focus:outline-none";

export function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="kicker mb-1 block">{label}</span>
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

/* ---------- Badge / kartu / lain ---------- */

export function Badge({ tone = "line", children }: { tone?: "line" | "ember" | "oxblood" | "moss" | "gold" | "ink"; children: React.ReactNode }) {
  const tones: Record<string, string> = {
    line: "border-line text-ink-soft",
    ember: "border-ember text-ember-deep",
    oxblood: "border-oxblood bg-oxblood text-[#fff4ee]",
    moss: "border-moss text-moss",
    gold: "border-gold text-[#7c5d10]",
    ink: "border-ink bg-ink text-paper",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 font-mono text-[11px] tracking-wide ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-lg border border-line bg-card ${className}`}>
      {children}
    </div>
  );
}

export function Empty({ title, hint, children }: { title: string; hint?: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-card/60 px-6 py-10 text-center">
      <p className="font-display text-xl italic">{title}</p>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

export function Err({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p className="rounded-md border border-oxblood/40 bg-oxblood/5 px-3 py-2 text-sm text-oxblood">
      {message}
    </p>
  );
}

export function Ok({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p className="rounded-md border border-moss/40 bg-moss/5 px-3 py-2 text-sm text-moss">
      {message}
    </p>
  );
}

/* ---------- Bilah atas global ---------- */

export function TopBar({ right }: { right?: React.ReactNode }) {
  return (
    <header className="border-b border-ink bg-ink text-paper">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Link to="/" className="flex items-baseline gap-2">
          <span className="font-display text-xl font-semibold italic">NovelCraft</span>
          <span className="hidden font-mono text-[11px] tracking-[0.18em] text-paper/60 uppercase sm:inline">
            ruang kerja novel
          </span>
        </Link>
        <div className="flex items-center gap-2">{right}</div>
      </div>
    </header>
  );
}

/* ---------- Cangkang workspace project (sidebar PRD §10) ---------- */

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
    <div className="min-h-screen">
      <TopBar
        right={
          <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-paper/80 hover:bg-white/10 hover:text-paper">
            <Icon name="back" /> Dashboard
          </Link>
        }
      />
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-6 md:flex-row">
        <aside className="shrink-0 md:w-60">
          <p className="kicker">Project</p>
          <h2 className="font-display mt-1 text-2xl leading-tight font-semibold">{title}</h2>
          {meta && <div className="mt-2 flex flex-wrap gap-1.5">{meta}</div>}
          <nav className="mt-4 flex flex-row gap-1 overflow-x-auto md:flex-col">
            {navItems.map((n) => (
              <NavLink
                key={n.to}
                to={n.to === "" ? `/projects/${id}` : `/projects/${id}/${n.to}`}
                end={n.to === ""}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors ${
                    isActive ? "bg-ink text-paper" : "text-ink-soft hover:bg-paper-deep hover:text-ink"
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

/* ---------- Halaman publik (tengah) ---------- */

export function Page({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen">
      <TopBar />
      <main className={`mx-auto px-5 py-10 ${wide ? "max-w-5xl" : "max-w-2xl"}`}>{children}</main>
    </div>
  );
}

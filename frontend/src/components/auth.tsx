import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { api, getToken } from "../lib/api";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<"loading" | "ok" | "no">("loading");
  const location = useLocation();

  React.useEffect(() => {
    if (!getToken()) {
      setState("no");
      return;
    }
    api
      .me()
      .then(() => setState("ok"))
      .catch(() => setState("no"));
  }, []);

  if (state === "loading")
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="font-display text-2xl italic">Membuka naskah…</p>
      </div>
    );
  if (state === "no")
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

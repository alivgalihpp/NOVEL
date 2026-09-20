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

  if (state === "loading") return <p style={{ padding: 24 }}>Memuat...</p>;
  if (state === "no")
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

export const box: React.CSSProperties = {
  fontFamily: "system-ui",
  maxWidth: 720,
  margin: "40px auto",
  padding: 24,
};

export const input: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: 8,
  margin: "8px 0",
  boxSizing: "border-box",
};

"use client";

import type { CSSProperties } from "react";
import { useEffect } from "react";
import { Sidebar } from "@/components/app-shell/Sidebar";
import { Header } from "@/components/app-shell/Header";
import { useAuth } from "@/hooks/useAuth";

const lightAdminTheme = {
  "--color-bg-base": "#f4f7fb",
  "--color-bg-surface": "#ffffff",
  "--color-bg-elevated": "#f8fafc",
  "--color-bg-overlay": "#eef2f7",
  "--color-border": "#e2e8f0",
  "--color-border-strong": "#cbd5e1",
  "--color-text-primary": "#0f172a",
  "--color-text-secondary": "#475569",
  "--color-text-muted": "#94a3b8",
} as CSSProperties;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { bootstrap } = useAuth();

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  return (
    <div
      style={lightAdminTheme}
      className="flex min-h-screen flex-col bg-[#f4f7fb] text-slate-950 lg:h-screen lg:flex-row"
    >
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

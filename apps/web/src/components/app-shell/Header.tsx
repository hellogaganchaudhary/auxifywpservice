"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

const titles: Record<string, string> = {
  "/dashboard": "Organization dashboard",
  "/inbox": "WhatsApp inbox",
  "/contacts": "CRM leads",
  "/broadcasts": "Broadcasts",
  "/templates": "Templates",
  "/analytics": "Analytics",
  "/settings/whatsapp": "WhatsApp profile",
  "/settings/organization": "Organization details",
  "/settings/profile": "Admin profile",
};

export function Header() {
  const pathname = usePathname() || "/dashboard";
  const { user } = useAuth();
  const title = titles[pathname] || (pathname.startsWith("/settings") ? "Settings" : "Workspace");

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-4 text-slate-950 backdrop-blur-xl sm:px-6">
      <div>
        <h1 className="truncate text-base font-display sm:text-xl">{title}</h1>
        <p className="hidden text-xs text-slate-500 sm:block">Enterprise WhatsApp inbox, broadcasts, analytics, and workspace operations.</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500 md:block">Search workspace · Cmd+K</div>
        <div className="hidden max-w-48 truncate rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 sm:block">
          {user?.name || user?.email || "Admin"}
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-xs font-bold text-accent">
          {(user?.name || user?.email || "A").slice(0, 1).toUpperCase()}
        </div>
      </div>
    </header>
  );
}

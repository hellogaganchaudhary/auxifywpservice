"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import type { AuthUser } from "@/stores/auth.store";

const navItems: Array<{ label: string; href: Route; roles?: AuthUser["role"][] }> = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Inbox", href: "/inbox" },
  { label: "Template", href: "/templates" },
  { label: "Contacts", href: "/contacts" },
  { label: "Admin Profile", href: "/settings/profile" },
  { label: "Broadcasts", href: "/broadcasts", roles: ["ADMIN", "MANAGER"] },
  { label: "Analytics", href: "/analytics", roles: ["ADMIN", "MANAGER"] },
  { label: "WhatsApp Profile", href: "/settings/whatsapp", roles: ["ADMIN"] },
  { label: "Organization", href: "/settings/organization", roles: ["ADMIN"] },
  { label: "Notifications", href: "/settings/notifications", roles: ["ADMIN", "MANAGER"] },
  { label: "Quick Replies", href: "/settings/quick-replies", roles: ["ADMIN", "MANAGER"] },
  { label: "Labels", href: "/settings/labels", roles: ["ADMIN", "MANAGER"] },
  { label: "API Keys", href: "/settings/api-keys", roles: ["ADMIN"] },
  { label: "Audit Log", href: "/settings/audit-log", roles: ["ADMIN", "MANAGER"] },
  { label: "Billing", href: "/settings/billing", roles: ["ADMIN"] },
];

export function Sidebar({ currentPath = "/dashboard" }: { currentPath?: string }) {
  const pathname = usePathname() || currentPath;
  const { user } = useAuth();
  return (
    <aside className="border-b border-slate-200 bg-white/95 p-4 text-slate-950 shadow-sm backdrop-blur-xl lg:flex lg:h-full lg:w-72 lg:flex-col lg:border-b-0 lg:border-r">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 font-bold text-emerald-700 shadow-sm">W</div>
        <div>
          <div className="font-display text-lg leading-none">WhatsAppAI</div>
          <div className="mt-1 text-xs text-slate-500">Organization CRM</div>
        </div>
      </div>
      <div className="mt-5 hidden rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:block">
        <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Signed in admin</div>
        <div className="mt-2 truncate text-sm font-semibold text-slate-900">{user?.name || "Workspace admin"}</div>
        <div className="mt-1 truncate text-xs text-slate-500">{user?.email || "Loading workspace"}</div>
        <div className="mt-3 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">{user?.role || "Loading"}</div>
      </div>
      <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:mt-6 lg:flex-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {navItems
          .filter((item) => !item.roles || (user && item.roles.includes(user.role)))
          .map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group whitespace-nowrap rounded-2xl px-3.5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950",
                active && "border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm"
              )}
            >
              <span className="inline-flex items-center gap-3">
                <span className={cn("h-1.5 w-1.5 rounded-full bg-slate-300 transition", active && "bg-emerald-600")} />
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-4 hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4 text-sm text-slate-500 lg:mt-auto lg:block">
        <div className="font-semibold text-slate-950">CRM ready</div>
        <div className="mt-1 text-xs leading-5">Upload leads, connect WhatsApp, manage inbox conversations, and send campaigns.</div>
      </div>
    </aside>
  );
}

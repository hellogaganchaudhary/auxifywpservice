"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems: Array<{ label: string; href: Route }> = [
  { label: "Organizations", href: "/super-admin/organizations" },
  { label: "Billing & Credits", href: "/super-admin/billing" },
];

export function SuperAdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { bootstrap, user, logout } = useAuth();

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-80 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="border-b border-slate-200 px-8 py-7">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">
              Platform control
            </div>
            <div className="mt-3 text-2xl font-semibold text-slate-900">WhatsAppAI</div>
            <div className="mt-1 text-sm text-slate-500">Super admin workspace</div>
          </div>

          <div className="px-6 py-6">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Signed in as</div>
              <div className="mt-2 text-sm font-semibold text-slate-900">
                {user?.name || "Platform operator"}
              </div>
              <div className="mt-1 text-sm text-slate-500">{user?.email || "Loading..."}</div>
              <div className="mt-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                {user?.role || "SUPER_ADMIN"}
              </div>
              <Button
                onClick={() => { logout(); router.push('/super-admin-login'); }}
                variant="ghost"
                className="mt-3 w-full"
              >
                Logout
              </Button>
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-2 px-4 pb-6">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-2xl px-4 py-3 text-sm font-medium transition",
                    active
                      ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-200 p-6">
            <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-slate-700 px-5 py-5 text-white">
              <div className="text-sm font-semibold">Enterprise controls</div>
              <div className="mt-2 text-sm text-slate-200">
                Manage tenants, platform billing, audit visibility, and onboarding operations.
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="flex flex-col gap-4 px-5 py-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Enterprise admin console
                </div>
                <h1 className="mt-2 text-2xl font-semibold text-slate-900">Super admin panel</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Platform-wide oversight for organizations, admins, billing, and operational health.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {navItems.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm font-medium transition lg:hidden",
                        active
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-600"
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </header>

          <main className="flex-1 px-5 py-6 sm:px-8 sm:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

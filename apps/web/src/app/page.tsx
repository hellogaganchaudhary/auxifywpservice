import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MarketingFooter, MarketingNav } from "@/components/marketing/MarketingShell";

const operatingMetrics = [
  { label: "Message delivery SLA", value: "99.9%" },
  { label: "Average first response", value: "42s" },
  { label: "Teams orchestrated", value: "24+" },
  { label: "Governed conversations", value: "1.8M" },
];

const modules = [
  {
    title: "Command inbox",
    body: "Real-time assignment, labels, notes, saved views, media context, and team routing in one operational console.",
  },
  {
    title: "Broadcast control tower",
    body: "Audience targeting, template governance, delivery analytics, recipient drilldowns, and export-ready campaign evidence.",
  },
  {
    title: "Template operations",
    body: "Create, submit, sync, monitor, and optimize Meta templates with approval status and performance analytics.",
  },
  {
    title: "Enterprise administration",
    body: "RBAC, API keys, audit logs, billing wallets, notification controls, and secure organization-level isolation.",
  },
];

const proof = ["Unified Communications ready", "Meta API aligned", "Role based access", "Webhook event pipeline"];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-bg-base text-text-primary">
      <MarketingNav />

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(37,211,102,0.22),transparent_28%),radial-gradient(circle_at_78%_10%,rgba(124,92,252,0.18),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_42%)]" />
        <div className="container-page relative grid min-h-[calc(100vh-4rem)] items-center gap-14 py-20 lg:grid-cols-[1fr_0.86fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-[0.22em] text-text-secondary">
              <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_18px_rgba(37,211,102,0.9)]" />
              Premium WhatsApp Business Suite
            </div>
            <h1 className="mt-8 max-w-5xl text-5xl font-display leading-[0.95] tracking-tight md:text-7xl">
              Enterprise messaging, designed for global support and growth teams.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-text-secondary">
              WhatsAppAI brings inbox operations, compliant broadcasts, Meta templates, analytics, billing, and administration into one premium operating system for business communication.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/login">
                <Button className="h-12 rounded-full px-7 text-sm">Login to console</Button>
              </Link>
              <Link href="/accept-invite">
                <Button variant="ghost" className="h-12 rounded-full px-7 text-sm">Create account / accept invite</Button>
              </Link>
            </div>
            <div className="mt-9 flex flex-wrap gap-3">
              {proof.map((item) => (
                <span key={item} className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-text-secondary">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-3 shadow-2xl shadow-black/30 backdrop-blur">
            <div className="rounded-[1.5rem] border border-white/10 bg-[#08110d] p-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-5">
                <div>
                  <div className="text-xs uppercase tracking-[0.24em] text-text-muted">Live command center</div>
                  <div className="mt-2 text-2xl font-display">Priority Inbox</div>
                </div>
                <span className="rounded-full bg-accent-muted px-3 py-1 text-xs text-accent">Online</span>
              </div>
              <div className="mt-5 space-y-3">
                {[
                  ["VIP onboarding", "Assigned to Aisha", "2m"],
                  ["Template approval", "Manager review", "8m"],
                  ["Broadcast replies", "Auto routed", "14m"],
                ].map(([title, sub, time]) => (
                  <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">{title}</div>
                        <div className="mt-1 text-sm text-text-secondary">{sub}</div>
                      </div>
                      <div className="text-xs text-text-muted">{time}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {operatingMetrics.slice(0, 4).map((metric) => (
                  <div key={metric.label} className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-4">
                    <div className="text-2xl font-display">{metric.value}</div>
                    <div className="mt-1 text-xs text-text-muted">{metric.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.02]">
        <div className="container-page grid gap-4 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {operatingMetrics.map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-white/10 bg-bg-surface/70 p-5">
              <div className="text-3xl font-display">{metric.value}</div>
              <div className="mt-2 text-sm text-text-secondary">{metric.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page py-20">
        <div className="max-w-2xl">
          <div className="text-sm uppercase tracking-[0.24em] text-accent">Platform modules</div>
          <h2 className="mt-4 text-4xl font-display md:text-5xl">Everything an enterprise WhatsApp team needs.</h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {modules.map((module, index) => (
            <div key={module.title} className="group rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-7 transition hover:-translate-y-1 hover:border-accent/30 hover:bg-white/[0.055]">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-accent/20 bg-accent-muted text-sm text-accent">
                0{index + 1}
              </div>
              <h3 className="mt-6 text-2xl font-display">{module.title}</h3>
              <p className="mt-3 leading-7 text-text-secondary">{module.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page pb-20">
        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(37,211,102,0.14),rgba(255,255,255,0.04)_44%,rgba(124,92,252,0.12))] p-8 md:p-12">
          <div className="grid items-end gap-8 lg:grid-cols-[1fr_0.7fr]">
            <div>
              <div className="text-sm uppercase tracking-[0.24em] text-accent">Ready for rollout</div>
              <h2 className="mt-4 max-w-3xl text-4xl font-display md:text-5xl">Launch a premium customer messaging workspace without rebuilding core infrastructure.</h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
              <Link href="/login"><Button className="h-12 rounded-full px-7">Sign in</Button></Link>
              <Link href="/features"><Button variant="ghost" className="h-12 rounded-full px-7">Explore platform</Button></Link>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}

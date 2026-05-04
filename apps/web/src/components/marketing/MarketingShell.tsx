import Link from "next/link";
import type { Route } from "next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems: Array<{ label: string; href: Route }> = [
  { label: "Platform", href: "/features" },
  { label: "Solutions", href: "/services" },
  { label: "Pricing", href: "/pricing" },
  { label: "Docs", href: "/docs" },
  { label: "Changelog", href: "/changelog" },
];

export function MarketingNav({ className }: { className?: string }) {
  return (
    <header className={cn("sticky top-0 z-50 border-b border-white/10 bg-bg-base/75 backdrop-blur-xl", className)}>
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent/30 bg-accent-muted text-sm font-bold text-accent shadow-[0_0_40px_rgba(37,211,102,0.18)]">
            W
          </span>
          <span className="font-display text-lg">WhatsAppAI</span>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-2 text-sm text-text-secondary transition hover:bg-white/5 hover:text-text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden rounded-full px-4 py-2 text-sm text-text-secondary transition hover:bg-white/5 hover:text-text-primary sm:inline-flex">
            Login
          </Link>
          <Link href="/accept-invite">
            <Button className="rounded-full px-5">Start / Accept invite</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/10 bg-bg-base">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
        <div>
          <div className="font-display text-lg">WhatsAppAI</div>
          <p className="mt-3 max-w-sm text-sm text-text-secondary">
            Enterprise WhatsApp Business API infrastructure for teams that need governed conversations, broadcasts, templates, and analytics.
          </p>
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs text-text-muted">
            Built as a module for unified communications platforms.
          </div>
        </div>
        <FooterGroup title="Product" items={["Inbox", "Broadcasts", "Templates", "Analytics"]} />
        <FooterGroup title="Company" items={["Security", "Docs", "Changelog", "Contact"]} />
        <FooterGroup title="Legal" items={["Privacy", "Terms", "DPA", "Status"]} />
      </div>
    </footer>
  );
}

function FooterGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-[0.2em] text-text-muted">{title}</div>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item} className="text-sm text-text-secondary">{item}</div>
        ))}
      </div>
    </div>
  );
}

export function PageHero({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <section className="relative overflow-hidden border-b border-white/10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,211,102,0.18),transparent_32%),radial-gradient(circle_at_78%_12%,rgba(124,92,252,0.16),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent)]" />
      <div className="container-page relative py-20 md:py-28">
        <div className="max-w-3xl">
          <div className="inline-flex rounded-full border border-accent/20 bg-accent-muted px-3 py-1 text-xs uppercase tracking-[0.24em] text-accent">
            {eyebrow}
          </div>
          <h1 className="mt-6 text-4xl font-display leading-tight md:text-6xl">{title}</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-text-secondary md:text-lg">{description}</p>
        </div>
      </div>
    </section>
  );
}

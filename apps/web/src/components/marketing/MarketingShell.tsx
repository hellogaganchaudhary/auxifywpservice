import Link from "next/link";
import type { Route } from "next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems: Array<{ label: string; href: Route }> = [
  { label: "Features", href: "/features" },
  { label: "Use Cases", href: "/services" },
  { label: "Pricing", href: "/pricing" },
  { label: "Developers", href: "/docs" },
  { label: "Resources", href: "/changelog" },
];

export function AuxifyLogo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative h-9 w-9 rounded-xl border border-blue-200 bg-white shadow-sm">
        <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent" />
        <span className="absolute left-2 top-2 h-1.5 w-1.5 rounded-sm bg-accent" />
        <span className="absolute bottom-2 right-2 h-1.5 w-1.5 rounded-sm bg-accent" />
        <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#0b1b3a]" />
        <span className="absolute bottom-2 left-2 h-1.5 w-1.5 rounded-full bg-[#0b1b3a]" />
        <span className="absolute left-[10px] top-[13px] h-px w-5 rotate-45 bg-accent" />
        <span className="absolute left-[10px] top-[20px] h-px w-5 -rotate-45 bg-accent" />
      </div>
      <div>
        <div className="text-xl font-black tracking-[-0.04em] text-[#0b1b3a]">Auxify</div>
        <div className="-mt-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-accent">Engage</div>
      </div>
    </div>
  );
}

export function MarketingNav({ className }: { className?: string }) {
  return (
    <header className={cn("sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl", className)}>
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3">
          <AuxifyLogo />
        </Link>
        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-blue-50 hover:text-[#0b1b3a]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-[#0b1b3a] sm:inline-flex">
            Login
          </Link>
          <Link href="/accept-invite">
            <Button className="rounded-full px-5">Start 14-day trial</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
        <div>
          <AuxifyLogo />
          <p className="mt-4 max-w-sm text-sm leading-6 text-slate-600">
            Enterprise WhatsApp, SMS, RCS, and Voice communication infrastructure for serious businesses.
          </p>
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
            Auxify × WhatsApp — built for clarity, scale, and enterprise trust.
          </div>
        </div>
        <FooterGroup title="Product" items={["Team Inbox", "Broadcasts", "Template Studio", "Analytics"]} />
        <FooterGroup title="Company" items={["Security", "Developers", "Resources", "Contact"]} />
        <FooterGroup title="Legal" items={["Privacy", "Terms", "DPA", "Status"]} />
      </div>
    </footer>
  );
}

function FooterGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{title}</div>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item} className="text-sm text-slate-600">{item}</div>
        ))}
      </div>
    </div>
  );
}

export function PageHero({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <section className="relative overflow-hidden border-b border-white/10">
      <div className="pointer-events-none absolute inset-0 auxify-node-grid opacity-70" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(22,131,255,0.14),transparent_32%),linear-gradient(180deg,#ffffff,rgba(247,250,255,0.8))]" />
      <div className="container-page relative py-20 md:py-28">
        <div className="max-w-3xl">
          <div className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-accent">
            {eyebrow}
          </div>
          <h1 className="mt-6 text-4xl font-black leading-tight tracking-[-0.05em] text-[#0b1b3a] md:text-6xl">{title}</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">{description}</p>
        </div>
      </div>
    </section>
  );
}

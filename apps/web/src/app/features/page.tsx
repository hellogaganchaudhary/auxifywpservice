import Link from "next/link";
import { MarketingFooter, MarketingNav, PageHero } from "@/components/marketing/MarketingShell";
import { Button } from "@/components/ui/button";

const features = [
  ["Realtime inbox", "Virtualized conversation queues, live socket updates, labels, notes, assignments, saved views, and media-aware context."],
  ["Broadcast orchestration", "Segment contacts, launch campaigns, monitor recipients, export analytics, and keep delivery evidence audit-ready."],
  ["Template lifecycle", "Create, submit, sync, and track Meta templates from draft to approval with performance visibility."],
  ["Contact intelligence", "Import, map, segment, enrich, and govern customer records with custom fields and bulk operations."],
  ["Analytics cockpit", "Track message volume, campaign performance, team activity, template quality, and credit usage."],
  ["Admin governance", "RBAC, API keys, billing, audit logs, WABA configuration, webhooks, and organization isolation."],
];

export default function FeaturesPage() {
  return (
    <main className="min-h-screen bg-bg-base text-text-primary">
      <MarketingNav />
      <PageHero
        eyebrow="Platform"
        title="A complete WhatsApp Business operating system."
        description="Built for enterprise teams that need high-throughput messaging, operational controls, Meta compliance, and a premium command center experience."
      />
      <section className="container-page grid gap-4 py-16 md:grid-cols-2 xl:grid-cols-3">
        {features.map(([title, body], index) => (
          <article key={title} className="rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-7">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-muted text-sm font-semibold text-accent">{index + 1}</div>
            <h2 className="mt-6 text-2xl font-display">{title}</h2>
            <p className="mt-3 leading-7 text-text-secondary">{body}</p>
          </article>
        ))}
      </section>
      <section className="container-page pb-16">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 md:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.45fr] lg:items-center">
            <div>
              <h2 className="text-3xl font-display md:text-4xl">Connect product, operations, and support in one governed workspace.</h2>
              <p className="mt-4 text-text-secondary">Start from the login console if the organization already exists, or accept an invitation to activate a team account.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
              <Link href="/login"><Button className="rounded-full px-6">Login</Button></Link>
              <Link href="/accept-invite"><Button variant="ghost" className="rounded-full px-6">Accept invite</Button></Link>
            </div>
          </div>
        </div>
      </section>
      <MarketingFooter />
    </main>
  );
}

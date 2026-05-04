import { MarketingFooter, MarketingNav, PageHero } from "@/components/marketing/MarketingShell";

const releases = [
  { version: "v0.9", title: "Enterprise design system pass", notes: ["Premium homepage and product pages", "Redesigned dashboard surface", "Improved authentication entry points"] },
  { version: "v0.8", title: "Messaging operations expanded", notes: ["Realtime inbox dedupe", "Saved views", "Team group routing", "Recipient-level broadcast analytics"] },
  { version: "v0.7", title: "Governance and administration", notes: ["API key lifecycle", "Audit logs", "Billing wallet", "Notification and label settings"] },
];

export default function ChangelogPage() {
  return (
    <main className="min-h-screen bg-bg-base text-text-primary">
      <MarketingNav />
      <PageHero
        eyebrow="Changelog"
        title="A transparent product evolution timeline."
        description="Track the platform improvements across design, messaging operations, governance, analytics, and production readiness."
      />
      <section className="container-page max-w-4xl py-16">
        <div className="space-y-4">
          {releases.map((release) => (
            <article key={release.version} className="rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-7">
              <div className="text-sm uppercase tracking-[0.22em] text-accent">{release.version}</div>
              <h2 className="mt-3 text-2xl font-display">{release.title}</h2>
              <ul className="mt-5 space-y-2 text-text-secondary">
                {release.notes.map((note) => <li key={note}>• {note}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </section>
      <MarketingFooter />
    </main>
  );
}

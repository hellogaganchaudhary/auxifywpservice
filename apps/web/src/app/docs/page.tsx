import { MarketingFooter, MarketingNav, PageHero } from "@/components/marketing/MarketingShell";

const docs = [
  ["Getting started", "Configure organization access, accept invites, connect WABA settings, and open the dashboard console."],
  ["Inbox operations", "Use filters, saved views, team routing, labels, notes, and media context to manage active conversations."],
  ["Broadcasts", "Prepare contacts, choose templates, launch campaigns, and review recipient-level delivery analytics."],
  ["Templates", "Create Meta templates, submit for review, sync status, and evaluate read and delivery performance."],
  ["API and webhooks", "Use API keys, authenticated access, webhook event logging, and integration patterns."],
  ["Administration", "Manage roles, billing wallet, settings, notifications, audit logs, and organization governance."],
];

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-bg-base text-text-primary">
      <MarketingNav />
      <PageHero
        eyebrow="Docs"
        title="Operator-ready documentation structure."
        description="A clean enterprise documentation hub for administrators, agents, managers, and platform teams using the WhatsAppAI workspace."
      />
      <section className="container-page grid gap-4 py-16 md:grid-cols-2 xl:grid-cols-3">
        {docs.map(([title, body]) => (
          <article key={title} className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-6">
            <h2 className="text-xl font-display">{title}</h2>
            <p className="mt-3 leading-7 text-text-secondary">{body}</p>
          </article>
        ))}
      </section>
      <MarketingFooter />
    </main>
  );
}

import { MarketingFooter, MarketingNav, PageHero } from "@/components/marketing/MarketingShell";
import { FeatureCard } from "@/components/marketing/Sections";

const blocks = [
  ["Clean REST API", "Send messages, receive webhooks, manage templates, control broadcasts, and export analytics with predictable endpoints."],
  ["Real-time webhooks", "Subscribe to message, status, error, template, and campaign events with replayable logs."],
  ["Sandbox-first workflow", "Use test numbers and isolated API keys before connecting production WhatsApp Business credentials."],
  ["SDK-ready patterns", "Node.js, Python, PHP, and Java examples fit directly into common backend workflows."],
  ["Postman collection", "Share integration flows across product, QA, and engineering teams."],
  ["Enterprise uptime", "Production API architecture designed for 99.9% availability and high-throughput messaging."],
];

export default function DevelopersPage() {
  return (
    <main className="min-h-screen bg-bg-base text-text-primary">
      <MarketingNav />
      <PageHero eyebrow="API & Developers" title="Build anything. Integrate everything." description="Auxify Engage gives developers clean APIs, real-time webhooks, sandbox access, and production-grade reliability for multi-channel communication workflows." />
      <section className="container-page grid gap-4 py-16 md:grid-cols-2 xl:grid-cols-3">
        {blocks.map(([title, body], index) => <FeatureCard key={title} title={title} body={body} index={index} />)}
      </section>
      <section className="container-page pb-16">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-3xl font-black tracking-[-0.04em] text-[#0b1b3a]">Key endpoints</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {["Send Message", "Receive Messages & Status Updates", "Manage Templates", "Broadcast Management", "Contact & Audience APIs", "Analytics Export"].map((item) => <div key={item} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700">{item}</div>)}
          </div>
        </div>
      </section>
      <MarketingFooter />
    </main>
  );
}

import { MarketingFooter, MarketingNav, PageHero } from "@/components/marketing/MarketingShell";

const services = [
  { title: "Customer care command center", body: "Route every inbound WhatsApp conversation to the right agent, team, or saved operational view." },
  { title: "Growth campaign execution", body: "Run targeted, template-approved broadcasts with recipient-level visibility and exportable performance." },
  { title: "Template governance office", body: "Centralize Meta template creation, review, sync, status tracking, and quality improvement workflows." },
  { title: "Enterprise communications module", body: "Embed WhatsAppAI into a broader unified communications stack with clean tenant boundaries and APIs." },
  { title: "Operations analytics", body: "Monitor support load, campaign outcomes, read rates, team performance, and wallet consumption." },
  { title: "Security and administration", body: "Control access with roles, audit actions, rotate API keys, and manage organization settings." },
];

export default function ServicesPage() {
  return (
    <main className="min-h-screen bg-bg-base text-text-primary">
      <MarketingNav />
      <PageHero
        eyebrow="Solutions"
        title="Designed for enterprise service, sales, and operations teams."
        description="Each workspace is built around the real workflows that make WhatsApp Business critical: care, campaigns, compliance, billing, and scale."
      />
      <section className="container-page py-16">
        <div className="grid gap-4 md:grid-cols-2">
          {services.map((service) => (
            <div key={service.title} className="rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-white/[0.055] to-white/[0.02] p-7">
              <h2 className="text-2xl font-display">{service.title}</h2>
              <p className="mt-3 leading-7 text-text-secondary">{service.body}</p>
            </div>
          ))}
        </div>
      </section>
      <MarketingFooter />
    </main>
  );
}

import { MarketingFooter, MarketingNav, PageHero } from "@/components/marketing/MarketingShell";

const resources = [
  ["WhatsApp Best Practices", "Compliance, engagement, and deliverability guides for serious teams."],
  ["Template Library", "50+ ready-to-use professional templates for high-converting workflows."],
  ["Case Studies", "Real results from Auxify Engage customers across regulated industries."],
  ["Industry Reports", "WhatsApp trends in Fintech, E-commerce, Healthcare, Logistics, and EdTech."],
  ["Video Tutorials", "Step-by-step walkthroughs of advanced features and governance workflows."],
  ["Webinars", "Monthly sessions with product and customer success teams."],
];

export default function ResourcesPage() {
  return (
    <main className="min-h-screen bg-bg-base text-text-primary">
      <MarketingNav />
      <PageHero eyebrow="Resources" title="Guides, templates, and best practices for WhatsApp at scale." description="Learn how high-performing teams design compliant, measurable, and reliable WhatsApp operations with Auxify Engage." />
      <section className="container-page grid gap-4 py-16 md:grid-cols-2 xl:grid-cols-3">
        {resources.map(([title, body]) => (
          <article key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold tracking-[-0.02em] text-[#0b1b3a]">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
          </article>
        ))}
      </section>
      <section className="container-page pb-16">
        <div className="rounded-[2rem] border border-blue-200 bg-blue-50 p-8">
          <h2 className="text-3xl font-black tracking-[-0.04em] text-[#0b1b3a]">Featured resources</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {["The Complete Guide to WhatsApp Business API in 2026", "50 High-Converting Broadcast Templates", "How We Reduced Support Costs by 62% Using WhatsApp"].map((item) => <div key={item} className="rounded-xl bg-white p-4 text-sm font-semibold text-slate-700 shadow-sm">{item}</div>)}
          </div>
        </div>
      </section>
      <MarketingFooter />
    </main>
  );
}

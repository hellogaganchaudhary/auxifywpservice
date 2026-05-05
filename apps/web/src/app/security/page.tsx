import { MarketingFooter, MarketingNav, PageHero } from "@/components/marketing/MarketingShell";
import { FeatureCard, CtaBand } from "@/components/marketing/Sections";

const items = [
  ["Role-based access control", "Admins, managers, agents, and viewers receive scoped access with clear tenant boundaries."],
  ["Full audit logging", "Every sensitive action is recorded for operational and compliance review."],
  ["Encrypted infrastructure", "Data is encrypted at rest and in transit with TLS-first production connectivity."],
  ["DPDP & GDPR ready", "Governance workflows support exports, access controls, and audit readiness."],
  ["Data residency options", "Support for India and Singapore deployment patterns for enterprise customers."],
  ["Trust statement", "Your data is your data. We never sell it. We never train models on it."],
];

export default function SecurityPage() {
  return (
    <main className="min-h-screen bg-bg-base text-text-primary">
      <MarketingNav />
      <PageHero eyebrow="Security & Compliance" title="Enterprise-grade security and compliance — built in from day one." description="Auxify Engage is designed for teams that need reliable access control, auditability, secure infrastructure, and compliance-ready workflows." />
      <section className="container-page grid gap-4 py-16 md:grid-cols-2 xl:grid-cols-3">
        {items.map(([title, body], index) => <FeatureCard key={title} title={title} body={body} index={index} />)}
      </section>
      <CtaBand title="Need a security review?" description="Request our security whitepaper, audit workflow overview, and enterprise deployment checklist." />
      <MarketingFooter />
    </main>
  );
}

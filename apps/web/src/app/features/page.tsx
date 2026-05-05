import { MarketingFooter, MarketingNav, PageHero } from "@/components/marketing/MarketingShell";
import { CtaBand, FeatureCard } from "@/components/marketing/Sections";

const groups = [
  ["Messaging", ["Full support for text, audio, video, documents, locations, contacts, and stickers", "Interactive messages with buttons and lists", "Rich media previews and inline playback", "Message status tracking: sent, delivered, read, failed"]],
  ["Inbox & Collaboration", ["Unified team inbox with powerful search and filters", "Message threading and conversation history", "Internal notes, @mentions, and team assignment", "SLA timers, priority flags, bulk actions, and smart folders"]],
  ["Templates & Automation", ["Visual template builder with live preview", "Variables, media headers, and quick-reply buttons", "One-click sync with WhatsApp Business Manager", "Template approval tracking and version history"]],
  ["Broadcasts & Campaigns", ["Advanced broadcast composer with rich media and interactive elements", "Audience segmentation using labels, custom fields, and engagement history", "Scheduling, recurrence, and A/B testing", "Real-time delivery, read, and reply analytics"]],
  ["Analytics & Insights", ["Message-level performance dashboards", "Campaign ROI and funnel analytics", "Contact engagement scoring", "Exportable CSV/PDF reports and custom date ranges"]],
  ["Security & Administration", ["Role-based access control", "Full audit logs for every action", "IP whitelisting and session management", "Data encryption and compliance-ready exports"]],
];

export default function FeaturesPage() {
  return (
    <main className="min-h-screen bg-bg-base text-text-primary">
      <MarketingNav />
      <PageHero eyebrow="Features" title="Everything you need for professional WhatsApp — and nothing you don’t." description="Auxify Engage combines messaging, collaboration, templates, campaigns, analytics, and security into one premium enterprise workspace." />
      <section className="container-page grid gap-4 py-16 md:grid-cols-2 xl:grid-cols-3">
        {groups.map(([title, items], index) => (
          <FeatureCard key={title as string} title={title as string} index={index} body={(items as string[]).join(" • ")} />
        ))}
      </section>
      <CtaBand title="Build a WhatsApp operation your team can trust." description="Launch a workspace with clear collaboration, accurate analytics, and tenant-specific WhatsApp credentials for every organization." />
      <MarketingFooter />
    </main>
  );
}

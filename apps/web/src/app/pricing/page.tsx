import Link from "next/link";
import { MarketingFooter, MarketingNav, PageHero } from "@/components/marketing/MarketingShell";
import { Button } from "@/components/ui/button";

const plans = [
  { name: "Growth", price: "Custom", body: "For teams launching WhatsApp support and broadcast operations.", features: ["Shared inbox", "Contacts and segments", "Templates", "Broadcast analytics"] },
  { name: "Scale", price: "Custom", body: "For multi-team operations with governance and deeper reporting.", features: ["Team routing", "Saved views", "API keys", "Audit logs", "Billing wallet"] },
  { name: "Enterprise", price: "Contract", body: "For platform teams embedding WhatsAppAI into a larger communication suite.", features: ["Multi-tenant controls", "Advanced webhooks", "Custom SLAs", "Security review", "Dedicated rollout"] },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-bg-base text-text-primary">
      <MarketingNav />
      <PageHero
        eyebrow="Pricing"
        title="Premium plans for serious messaging operations."
        description="Pricing is aligned to organization scale, conversation volume, platform integration depth, and Meta messaging usage."
      />
      <section className="container-page grid gap-4 py-16 lg:grid-cols-3">
        {plans.map((plan, index) => (
          <article key={plan.name} className="rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-7">
            <div className="text-sm uppercase tracking-[0.22em] text-accent">{plan.name}</div>
            <div className="mt-5 text-4xl font-display">{plan.price}</div>
            <p className="mt-4 min-h-16 text-text-secondary">{plan.body}</p>
            <ul className="mt-6 space-y-3 text-sm text-text-secondary">
              {plan.features.map((feature) => <li key={feature}>• {feature}</li>)}
            </ul>
            <Link href={index === 0 ? "/accept-invite" : "/login"}>
              <Button variant={index === 1 ? "solid" : "ghost"} className="mt-7 w-full rounded-full">
                {index === 0 ? "Start with invite" : "Talk to team"}
              </Button>
            </Link>
          </article>
        ))}
      </section>
      <MarketingFooter />
    </main>
  );
}

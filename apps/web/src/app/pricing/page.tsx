import Link from "next/link";
import { MarketingFooter, MarketingNav, PageHero } from "@/components/marketing/MarketingShell";
import { Button } from "@/components/ui/button";

const plans = [
  { name: "Starter", price: "₹2,999", detail: "/month", features: ["Up to 10,000 messages", "Basic inbox & templates", "Standard support", "1 WhatsApp number"] },
  { name: "Growth", price: "₹9,999", detail: "/month", featured: true, features: ["Up to 50,000 messages", "Full inbox + collaboration", "Advanced broadcasts & analytics", "Priority support", "3 WhatsApp numbers"] },
  { name: "Enterprise", price: "Custom", detail: "", features: ["Unlimited messages", "Dedicated success manager", "Custom integrations & SLAs", "On-premise options & data residency", "White-glove onboarding", "Full API access & webhooks"] },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-bg-base text-text-primary">
      <MarketingNav />
      <PageHero eyebrow="Pricing" title="Simple, transparent pricing. Scale without surprises." description="Choose a plan for your WhatsApp operation, then scale with usage-based add-ons and additional numbers as your teams grow." />
      <section className="container-page grid gap-4 py-16 lg:grid-cols-3">
        {plans.map((plan) => (
          <article key={plan.name} className={`rounded-[2rem] border p-7 shadow-sm ${plan.featured ? "border-blue-200 bg-[#0b1b3a] text-white shadow-blue-950/10" : "border-slate-200 bg-white"}`}>
            <div className={`${plan.featured ? "text-blue-100" : "text-accent"} text-xs font-bold uppercase tracking-[0.22em]`}>{plan.name}</div>
            <div className="mt-5 flex items-end gap-1">
              <span className="text-4xl font-black tracking-[-0.04em]">{plan.price}</span>
              <span className={plan.featured ? "text-blue-100" : "text-slate-500"}>{plan.detail}</span>
            </div>
            <ul className={`mt-6 space-y-3 text-sm ${plan.featured ? "text-blue-50" : "text-slate-600"}`}>
              {plan.features.map((feature) => <li key={feature} className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-accent" />{feature}</li>)}
            </ul>
            <Link href="/accept-invite"><Button variant={plan.featured ? "solid" : "ghost"} className={`mt-7 w-full rounded-full ${plan.featured ? "bg-white text-accent hover:bg-blue-50" : ""}`}>Start 14-day free trial</Button></Link>
          </article>
        ))}
      </section>
      <section className="container-page pb-16">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-2xl font-black tracking-[-0.03em] text-[#0b1b3a]">All plans include unlimited templates, full analytics, team collaboration, 99.97% uptime SLA, and security features.</h2>
          <p className="mt-3 text-slate-600">Usage add-ons: additional messages ₹0.12–₹0.18 per message • Extra WhatsApp numbers ₹1,499/number/month</p>
        </div>
      </section>
      <MarketingFooter />
    </main>
  );
}

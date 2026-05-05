import Link from "next/link";
import { MarketingFooter, MarketingNav, PageHero } from "@/components/marketing/MarketingShell";
import { Button } from "@/components/ui/button";

const useCases = [
  ["Fintech & Banking", ["OTP & transaction alerts", "Loan application updates", "Secure document sharing", "KYC verification flows"]],
  ["E-commerce & D2C", ["Order confirmations and delivery updates", "Abandoned cart recovery", "Interactive product recommendations", "Post-purchase feedback"]],
  ["Healthcare", ["Appointment reminders", "Lab report delivery", "Prescription reminders", "Patient follow-up automation"]],
  ["Logistics & Delivery", ["Real-time shipment tracking", "Delivery confirmation with proof", "Driver-customer communication", "Exception handling"]],
  ["EdTech & Education", ["Course enrollment confirmations", "Live class reminders", "Assignment workflows", "Parent-teacher communication"]],
];

export default function ServicesPage() {
  return (
    <main className="min-h-screen bg-bg-base text-text-primary">
      <MarketingNav />
      <PageHero eyebrow="Use cases" title="Auxify Engage powers WhatsApp communication across industries." description="From financial services to logistics, Auxify gives teams a clean, compliant way to operate customer communication at scale." />
      <section className="container-page py-16">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {useCases.map(([title, items]) => (
            <article key={title as string} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold tracking-[-0.02em] text-[#0b1b3a]">{title as string}</h2>
              <ul className="mt-5 space-y-3 text-sm text-slate-600">
                {(items as string[]).map((item) => <li key={item} className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-accent" />{item}</li>)}
              </ul>
              <Link href="/contact"><Button variant="ghost" className="mt-6 rounded-full">Book a demo</Button></Link>
            </article>
          ))}
        </div>
      </section>
      <MarketingFooter />
    </main>
  );
}

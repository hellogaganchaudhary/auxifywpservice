import { MarketingFooter, MarketingNav, PageHero } from "@/components/marketing/MarketingShell";
import { Button } from "@/components/ui/button";

const fields = ["Full Name*", "Work Email*", "Company Name*", "Phone Number*", "Monthly Messages", "Industry", "How did you hear about us?", "Message / Specific Requirements"];

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-bg-base text-text-primary">
      <MarketingNav />
      <PageHero eyebrow="Contact" title="Let’s build something great together." description="Book a personalized demo and see how Auxify Engage can support your WhatsApp, SMS, RCS, and Voice workflows." />
      <section className="container-page grid gap-8 py-16 lg:grid-cols-[1fr_0.8fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-black tracking-[-0.03em] text-[#0b1b3a]">Book a personalized demo</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {fields.map((field) => (
              <input key={field} placeholder={field} className="h-12 rounded-md border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-blue-300 focus:bg-white" />
            ))}
          </div>
          <Button className="mt-6 h-12 rounded-full px-7">Book Demo (30 minutes)</Button>
        </div>
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-black tracking-[-0.03em] text-[#0b1b3a]">Other ways to reach us</h2>
          <div className="mt-6 space-y-4 text-sm leading-6 text-slate-600">
            <p><strong>Email:</strong> engage@auxify.in</p>
            <p><strong>WhatsApp:</strong> +91 98765 43210</p>
            <p><strong>Phone:</strong> +91 22 4000 1234</p>
            <p><strong>Office:</strong><br />Auxify Technologies Pvt. Ltd.<br />WeWork, BKC, Mumbai – 400051, India</p>
            <p><strong>Support Hours:</strong><br />Monday–Friday: 9:00 AM – 7:00 PM IST<br />Enterprise customers: 24×7 priority support</p>
          </div>
        </div>
      </section>
      <MarketingFooter />
    </main>
  );
}

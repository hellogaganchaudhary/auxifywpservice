import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MarketingFooter, MarketingNav } from "@/components/marketing/MarketingShell";
import { CtaBand, FeatureCard, SectionHeader } from "@/components/marketing/Sections";

const capabilities = [
  ["Complete Two-Way Messaging", "Text, audio, video, documents, locations, interactive messages, and buttons — all handled beautifully."],
  ["Intelligent Team Inbox", "Unified inbox with search, filters, assignment, internal notes, and SLA tracking."],
  ["Template Studio", "Create, preview, and sync professional templates with variables, media headers, and quick replies."],
  ["Broadcast & Campaign Engine", "Launch marketing and utility broadcasts with audience segmentation, scheduling, and real-time performance tracking."],
  ["Deep Analytics", "Message-level, contact-level, and campaign-level insights with exportable reports."],
  ["Enterprise Security", "Role-based access, full audit logs, encryption, and compliance-ready infrastructure."],
];

const trust = ["150+ companies", "12M+ messages delivered", "99.97% uptime", "SOC2 & DPDP aligned"];
const reasons = ["Sub-second delivery at scale", "Clean, modern interface your team will love", "Transparent usage-based pricing", "Dedicated onboarding and priority support", "Full API access for custom workflows"];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-bg-base text-text-primary">
      <MarketingNav />

      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 auxify-node-grid opacity-60" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(22,131,255,0.16),transparent_30%),linear-gradient(180deg,#ffffff,rgba(247,250,255,0.92))]" />
        <div className="container-page relative grid min-h-[calc(100vh-4rem)] items-center gap-14 py-20 lg:grid-cols-[1fr_0.86fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-accent">
              Auxify × WhatsApp
            </div>
            <h1 className="mt-8 max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.06em] text-[#0b1b3a] md:text-7xl">
              Enterprise WhatsApp. Built for scale. Designed for clarity.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Auxify Engage is the complete WhatsApp Business platform trusted by fast-growing companies. Full two-way messaging, rich media, interactive messages, intelligent broadcasts, and real-time analytics — all in one elegant, enterprise-grade workspace.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/accept-invite"><Button className="h-12 rounded-full px-7">Start 14-day Enterprise Trial</Button></Link>
              <Link href="/contact"><Button variant="ghost" className="h-12 rounded-full px-7">Watch 90-second demo</Button></Link>
            </div>
            <div className="mt-9 flex flex-wrap gap-3">
              {trust.map((item) => (
                <span key={item} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-3 shadow-2xl shadow-blue-950/10">
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-5">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Auxify Engage</div>
                  <div className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#0b1b3a]">Priority Inbox</div>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-accent">Live</span>
              </div>
              <div className="mt-5 space-y-3">
                {[["Broadcast replies", "Auto-routed to growth team", "2m"], ["KYC document received", "Assigned to support", "8m"], ["Template campaign", "7,248 delivered", "14m"]].map(([title, sub, time]) => (
                  <div key={title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-[#0b1b3a]">{title}</div>
                        <div className="mt-1 text-sm text-slate-500">{sub}</div>
                      </div>
                      <div className="text-xs text-slate-400">{time}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {[["99.97%", "Uptime"], ["12M+", "Messages"], ["47%", "Reply lift"], ["<1s", "Event sync"]].map(([value, label]) => (
                  <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-2xl font-black text-[#0b1b3a]">{value}</div>
                    <div className="mt-1 text-xs text-slate-500">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-20">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1fr] lg:items-center">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.24em] text-accent">The problem</div>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] text-[#0b1b3a]">WhatsApp is powerful. Most platforms make it painful.</h2>
          </div>
          <p className="text-lg leading-8 text-slate-600">
            You’re stuck with clunky interfaces, broken media handling, scattered analytics, and constant compliance worries. Your team loses conversations. Campaigns underperform. Scaling feels risky. There’s a better way.
          </p>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-20">
        <div className="container-page">
          <SectionHeader eyebrow="The solution" title="Auxify Engage — WhatsApp built for enterprises." description="Send every message type, collaborate through a professional team inbox, sync templates, connect tenant-specific WhatsApp credentials, and measure every broadcast with compliance-ready auditability." />
          <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {capabilities.map(([title, body], index) => <FeatureCard key={title} title={title} body={body} index={index} />)}
          </div>
        </div>
      </section>

      <section className="container-page py-20">
        <div className="grid gap-12 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-3xl font-black tracking-[-0.04em] text-[#0b1b3a]">Why teams choose Auxify Engage</h2>
            <ul className="mt-6 space-y-4 text-slate-600">
              {reasons.map((reason) => <li key={reason} className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-accent" />{reason}</li>)}
            </ul>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-3xl font-black tracking-[-0.04em] text-[#0b1b3a]">How it works</h2>
            <div className="mt-6 space-y-5">
              {["Connect your WhatsApp Business account in under 3 minutes", "Orchestrate conversations through the intelligent inbox", "Scale & optimize with powerful broadcasts and live analytics"].map((step, index) => (
                <div key={step} className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-accent">{index + 1}</div>
                  <div className="font-medium text-slate-700">{step}</div>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold text-accent">From first message to millions — in minutes.</div>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="container-page">
          <SectionHeader eyebrow="Social proof" title="Trusted by high-growth teams that cannot afford messaging chaos." />
          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            {["Auxify Engage gave us the cleanest WhatsApp inbox and the most accurate broadcast analytics we’ve ever seen. Response rate improved by 47% in the first month.", "We send 80,000+ messages every week. Auxify is the only platform that has never failed us on delivery or compliance."].map((quote, index) => (
              <blockquote key={quote} className="rounded-[2rem] border border-slate-200 bg-slate-50 p-8 text-lg leading-8 text-[#0b1b3a]">
                “{quote}”
                <footer className="mt-5 text-sm font-semibold text-slate-500">— {index === 0 ? "Head of Growth, Leading Indian D2C Brand" : "CTO, Series B Fintech"}</footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      <CtaBand title="Ready to run WhatsApp like a true enterprise?" description="Join 150+ companies using Auxify Engage to deliver exceptional customer experiences at scale. No credit card required • Full access • Cancel anytime." />
      <MarketingFooter />
    </main>
  );
}

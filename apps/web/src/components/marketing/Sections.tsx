import Link from "next/link";
import type { Route } from "next";
import { Button } from "@/components/ui/button";

export function SectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <div className="text-xs font-bold uppercase tracking-[0.24em] text-accent">{eyebrow}</div>
      <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-[#0b1b3a] md:text-5xl">{title}</h2>
      {description ? <p className="mt-4 text-base leading-7 text-slate-600">{description}</p> : null}
    </div>
  );
}

export function FeatureCard({ title, body, index }: { title: string; body: string; index?: number }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5 transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-900/5">
      {index !== undefined ? (
        <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-sm font-bold text-accent">
          {String(index + 1).padStart(2, "0")}
        </div>
      ) : null}
      <h3 className="text-xl font-bold tracking-[-0.02em] text-[#0b1b3a]">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
    </article>
  );
}

export function CtaBand({ title, description, primaryHref = "/accept-invite", secondaryHref = "/login" }: { title: string; description: string; primaryHref?: Route; secondaryHref?: Route }) {
  return (
    <section className="container-page py-16">
      <div className="relative overflow-hidden rounded-[2rem] border border-blue-200 bg-[#0b1b3a] p-8 text-white shadow-xl shadow-blue-950/10 md:p-12">
        <div className="absolute inset-0 auxify-node-grid opacity-20" />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_0.55fr] lg:items-center">
          <div>
            <h2 className="max-w-3xl text-3xl font-black tracking-[-0.04em] md:text-5xl">{title}</h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-blue-100">{description}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
            <Link href={primaryHref}><Button className="h-11 rounded-full bg-white px-6 text-accent hover:bg-blue-50">Start free trial</Button></Link>
            <Link href={secondaryHref}><Button variant="ghost" className="h-11 rounded-full border-white/25 bg-white/10 px-6 text-white hover:bg-white/15">Book demo</Button></Link>
          </div>
        </div>
      </div>
    </section>
  );
}

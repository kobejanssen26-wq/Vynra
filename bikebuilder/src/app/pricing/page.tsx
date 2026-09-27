import { Check } from "lucide-react";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Pricing" };

const PLANS = [
  {
    name: "Rider",
    price: "€0",
    period: "forever",
    blurb: "Everything you need to plan a build.",
    cta: { label: "Start Building", href: "/builder" },
    features: ["Full bike builder", "Compatibility checks", "Build assistant", "Compare two bikes", "Save builds on this device"],
  },
  {
    name: "Pro",
    price: "€6",
    period: "per month",
    blurb: "For riders who build and upgrade often.",
    cta: { label: "Join the waitlist", href: "/login?plan=pro" },
    featured: true,
    features: ["Everything in Rider", "Cloud-synced builds", "Price-drop alerts", "Photoreal AI renders", "Unlimited comparisons & exports"],
  },
  {
    name: "Shop",
    price: "Custom",
    period: "",
    blurb: "For bike shops and fitters.",
    cta: { label: "Talk to us", href: "/login?plan=shop" },
    features: ["Everything in Pro", "Customer build quotes", "Your own stock & pricing", "Branded build pages", "Team seats"],
  },
];

const ROADMAP = [
  ["Retailer integrations", "Live prices and stock from retailer feeds; one-click cart where retailers support it."],
  ["Photoreal visualization", "AI image generation from your exact component list."],
  ["AR preview", "Place your build in your garage at real scale."],
  ["Bike fitting", "Fit-driven frame size, stem and bar recommendations."],
  ["Maintenance tracking", "Service intervals per component, based on your riding."],
];

export default function PricingPage() {
  return (
    <>
      <section className="border-b border-line bg-white">
        <Container className="py-16 text-center">
          <p className="eyebrow text-accent">Pricing</p>
          <h1 className="mx-auto mt-4 max-w-2xl font-display text-4xl font-semibold tracking-[-0.03em] sm:text-[52px] sm:leading-[1.05]">Free to build. Pro when you want more.</h1>
          <p className="mx-auto mt-4 max-w-lg text-[17px] text-muted">Paid plans aren&apos;t live yet — this is a preview of what&apos;s planned.</p>
        </Container>
      </section>
      <Container className="py-14">
        <div className="grid gap-5 lg:grid-cols-3">
          {PLANS.map((p) => (
            <div key={p.name} className={cn("flex flex-col rounded-xl border p-7", p.featured ? "border-ink bg-ink text-white" : "border-line bg-white")}>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold">{p.name}</h2>
                {p.featured && <span className="rounded-sm bg-accent px-2 py-0.5 text-[11.5px] font-medium">Planned</span>}
              </div>
              <p className={cn("mt-1 text-[14px]", p.featured ? "text-white/60" : "text-muted")}>{p.blurb}</p>
              <p className="mt-6 font-display text-5xl font-semibold tracking-[-0.03em]">{p.price}<span className={cn("ml-1.5 text-[14px] font-normal tracking-normal", p.featured ? "text-white/50" : "text-muted")}>{p.period}</span></p>
              <ul className="mt-7 flex-1 space-y-3 text-[14.5px]">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2.5"><Check className={cn("mt-0.5 size-4 shrink-0", p.featured ? "text-accent-bright" : "text-accent")} />{f}</li>
                ))}
              </ul>
              <ButtonLink href={p.cta.href} variant={p.featured ? "accent" : "outline"} className="mt-8 w-full">{p.cta.label}</ButtonLink>
            </div>
          ))}
        </div>
      </Container>
      <section id="roadmap" className="scroll-mt-20 border-t border-line bg-paper-2 py-16">
        <Container>
          <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">On the roadmap</h2>
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {ROADMAP.map(([t, d]) => (
              <li key={t} className="border-t border-ink/80 pt-4">
                <p className="font-medium">{t}</p>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{d}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>
    </>
  );
}

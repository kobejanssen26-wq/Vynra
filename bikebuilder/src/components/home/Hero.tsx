import { ArrowRight, Check } from "lucide-react";
import Image from "next/image";
import { BikeVisual } from "@/components/bike/BikeVisual";
import { ButtonLink } from "@/components/ui/button";
import { getComponent } from "@/lib/catalog";
import { checkCompatibility } from "@/lib/compatibility/engine";
import { getCommunityBuild } from "@/lib/community/data";
import { formatEur, formatKg } from "@/lib/format";
import { PHOTOS } from "@/lib/images";
import { computeStats } from "@/lib/stats";
import { Reveal } from "./Reveal";

export function Hero() {
  const build = getCommunityBuild("ardennes-stumpy")!;
  const stats = computeStats(build.discipline, build.parts);
  const compat = checkCompatibility(build.discipline, build.parts);
  const rows = (["frame", "fork", "brakes"] as const).map((c) => getComponent(build.parts[c])!);

  return (
    <section className="relative isolate overflow-hidden bg-ink text-white">
      <Image src={PHOTOS.heroMtbJump} alt="Mountain biker jumping on a forest trail" fill priority sizes="100vw" className="-z-20 object-cover object-[70%_40%] opacity-70" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/80 to-ink/20" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-ink to-transparent" />

      <div className="mx-auto grid min-h-[min(900px,100svh)] max-w-[1320px] items-center gap-12 px-4 pb-16 pt-32 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:px-10 lg:pb-24">
        <Reveal>
          <p className="eyebrow text-accent-bright">Real components · Live compatibility · AI guidance</p>
          <h1 className="mt-6 max-w-[14ch] font-display text-[44px] font-semibold leading-[1.02] tracking-[-0.035em] sm:text-[64px] lg:text-[76px]">
            Build your dream bike before you buy it.
          </h1>
          <p className="mt-6 max-w-[54ch] text-[17px] leading-relaxed text-white/70 sm:text-lg">
            Choose from thousands of real bike components, check compatibility, compare prices, and let AI visualize your perfect bike before spending a single euro.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <ButtonLink href="/builder" variant="accent" size="lg">
              Start Building <ArrowRight className="size-4" />
            </ButtonLink>
            <ButtonLink href="/community" variant="inverse-outline" size="lg">
              Explore Community Builds
            </ButtonLink>
          </div>
        </Reveal>

        <Reveal delay={0.15} className="lg:justify-self-end">
          <div className="w-full max-w-[560px] overflow-hidden rounded-xl border border-white/10 bg-ink/85 shadow-2xl backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
              <div>
                <p className="text-[13px] font-medium text-white">{build.name}</p>
                <p className="text-[11.5px] text-white/45">Trail · 29&quot; · Shimano XTR</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-sm bg-accent/20 px-2 py-1 text-[11.5px] font-medium text-accent-bright">
                <Check className="size-3" strokeWidth={3} /> {compat.rules.filter((r) => r.applicable).length} checks passed
              </span>
            </div>
            <div className="bg-gradient-to-b from-white/[0.04] to-transparent px-4 pt-4">
              <BikeVisual discipline={build.discipline} selection={build.parts} tone="dark" />
            </div>
            <div className="grid grid-cols-3 border-t border-white/10">
              {[
                ["Price", formatEur(stats.priceEur)],
                ["Weight", formatKg(stats.weightKg)],
                ["Performance", `${stats.performance}/100`],
              ].map(([k, v]) => (
                <div key={k} className="border-r border-white/10 px-5 py-3.5 last:border-r-0">
                  <p className="text-[11px] uppercase tracking-wider text-white/40">{k}</p>
                  <p className="tabular mt-0.5 font-display text-lg font-semibold">{v}</p>
                </div>
              ))}
            </div>
            <ul className="divide-y divide-white/10 border-t border-white/10 text-[13px]">
              {rows.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-4 px-5 py-2.5">
                  <span className="w-16 shrink-0 text-white/40 capitalize">{c.category}</span>
                  <span className="min-w-0 flex-1 truncate text-white/85">{c.brand} {c.model}</span>
                  <span className="tabular text-white/60">{formatEur(c.priceEur)}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

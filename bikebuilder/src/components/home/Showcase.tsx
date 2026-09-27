import { ArrowRight, Sparkles } from "lucide-react";
import Image from "next/image";
import { ButtonLink } from "@/components/ui/button";
import { Container, SectionHeading } from "@/components/ui/container";
import { Meter } from "@/components/ui/meter";
import { respond } from "@/lib/assistant/engine";
import { formatEur, formatKg } from "@/lib/format";
import { PHOTOS } from "@/lib/images";
import { PRESETS } from "@/lib/presets";
import { computeStats } from "@/lib/stats";
import { Reveal } from "./Reveal";

/** Dark section showing a real assistant answer computed from the default build. */
export function Showcase() {
  const parts = PRESETS.mtb.parts;
  const stats = computeStats("mtb", parts);
  const reply = respond({ discipline: "mtb", selection: parts, message: "I mainly ride trails" });
  const first = reply.swaps[0];

  return (
    <section className="relative overflow-hidden bg-ink py-24 text-white sm:py-32">
      <Container className="grid items-center gap-16 lg:grid-cols-2">
        <div>
          <SectionHeading
            inverse
            eyebrow="The builder"
            title="An assistant that explains the trade-off, not just the answer."
            lead="Tell it your budget, terrain and priorities. Every suggestion comes with the reason — grams saved, euros spent, what you gain and what you give up."
          />
          <div className="mt-10 grid max-w-md grid-cols-2 gap-x-8 gap-y-5">
            {[
              ["Performance", stats.performance],
              ["Comfort", stats.comfort],
              ["Durability", stats.durability],
            ].map(([k, v]) => (
              <div key={k as string}>
                <div className="flex justify-between text-[13px]"><span className="text-white/55">{k}</span><span className="tabular font-medium">{v}{k === "Performance" ? "/100" : "%"}</span></div>
                <Meter value={v as number} tone="light" className="mt-2" />
              </div>
            ))}
            <div>
              <div className="flex justify-between text-[13px]"><span className="text-white/55">Price · Weight</span></div>
              <p className="tabular mt-1 font-display text-lg font-semibold">{formatEur(stats.priceEur)} · {formatKg(stats.weightKg)}</p>
            </div>
          </div>
          <ButtonLink href="/builder" variant="inverse" size="lg" className="mt-10">
            Open the builder <ArrowRight className="size-4" />
          </ButtonLink>
        </div>

        <Reveal>
          <div className="relative">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
              <Image src={PHOTOS.hardtailHill} alt="Mountain bike on a grassy hillside" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-transparent" />
            </div>
            <div className="relative -mt-28 ml-4 mr-4 space-y-3 sm:ml-10 sm:mr-0">
              <div className="ml-auto w-fit max-w-[80%] rounded-lg rounded-br-sm bg-white px-4 py-2.5 text-[14px] text-ink shadow-lift">I mainly ride trails.</div>
              <div className="max-w-[92%] rounded-lg rounded-bl-sm border border-white/10 bg-ink-2 p-4 text-[14px] leading-relaxed text-white/85 shadow-lift">
                <p className="mb-2 flex items-center gap-1.5 text-[12px] font-medium text-accent-bright"><Sparkles className="size-3.5" /> BikeBuilder AI</p>
                {first ? first.reason : reply.text}
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

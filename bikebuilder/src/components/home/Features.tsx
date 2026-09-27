import { Check, Layers, ScanLine, ShieldCheck, X } from "lucide-react";
import { BikeVisual } from "@/components/bike/BikeVisual";
import { Container, SectionHeading } from "@/components/ui/container";
import { getComponent } from "@/lib/catalog";
import { getCommunityBuild } from "@/lib/community/data";
import { formatEur, formatGrams } from "@/lib/format";
import { Reveal } from "./Reveal";

export function Features() {
  const beast = getCommunityBuild("featherweight-xc")!;
  const parts = ["sram-xx-sl-transmission", "rockshox-sid-sl-ultimate", "dt-xrc-1200", "fox-36-factory"].map((id) => getComponent(id)!);

  return (
    <section className="bg-paper py-24 sm:py-32">
      <Container>
        <SectionHeading
          eyebrow="Why BikeBuilder AI"
          title="Everything a mechanic checks, before you spend a euro."
          lead="Pick parts the way you'd plan a real build — with the specs, the standards and the trade-offs in front of you."
        />
        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          <Reveal>
            <FeatureCard icon={<Layers className="size-4" />} title="Real Components" text="Build with real parts from Shimano, SRAM, Fox, RockShox, DT Swiss, Trek, Canyon, Specialized and Öhlins — with prices, weights and specs.">
              <ul className="divide-y divide-line text-[13px]">
                {parts.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0 truncate"><span className="font-medium text-ink">{c.brand}</span> <span className="text-muted">{c.model}</span></span>
                    <span className="tabular shrink-0 text-muted">{formatGrams(c.weightG)}</span>
                    <span className="tabular w-14 shrink-0 text-right font-medium text-ink">{formatEur(c.priceEur)}</span>
                  </li>
                ))}
              </ul>
            </FeatureCard>
          </Reveal>
          <Reveal delay={0.08}>
            <FeatureCard icon={<ScanLine className="size-4" />} title="AI Visualization" text="Every major component change updates the visualization — fork travel, tire width, rims, rotors, cockpit and seatpost are drawn from the actual parts.">
              <div className="-mx-2 -mb-3">
                <BikeVisual discipline={beast.discipline} selection={beast.parts} />
              </div>
            </FeatureCard>
          </Reveal>
          <Reveal delay={0.16}>
            <FeatureCard icon={<ShieldCheck className="size-4" />} title="Smart Compatibility" text="Wheel size, fork travel, freehub bodies, drivetrain systems, brake mounts, rotor sizes, bar clamps and seatpost fit are checked as you build.">
              <ul className="space-y-2 text-[13px]">
                {[
                  [true, "Cassette fits the freehub", "XD driver"],
                  [true, "Fork travel fits the frame", "160 mm in 150–160"],
                  [true, "Brake caliper mounts", "Post mount"],
                  [false, "Handlebar and stem clamp", "35 mm bar in 31.8 mm stem"],
                ].map(([ok, label, detail]) => (
                  <li key={label as string} className="flex items-center gap-2.5 rounded-md border border-line bg-paper px-3 py-2">
                    {ok ? <Check className="size-3.5 text-accent" strokeWidth={3} /> : <X className="size-3.5 text-danger" strokeWidth={3} />}
                    <span className="font-medium text-ink">{label}</span>
                    <span className={`ml-auto text-right ${ok ? "text-muted" : "text-danger"}`}>{detail}</span>
                  </li>
                ))}
              </ul>
            </FeatureCard>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

function FeatureCard({ icon, title, text, children }: { icon: React.ReactNode; title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col rounded-lg border border-line bg-white p-6 shadow-card">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-md bg-ink text-white">{icon}</span>
        <h3 className="font-display text-lg font-semibold tracking-[-0.01em]">{title}</h3>
      </div>
      <p className="mt-3 text-[14.5px] leading-relaxed text-muted">{text}</p>
      <div className="mt-6 flex-1 rounded-md border border-line bg-paper/60 p-4">{children}</div>
    </div>
  );
}

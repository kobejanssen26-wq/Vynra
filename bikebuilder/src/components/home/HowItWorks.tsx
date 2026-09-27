import { Container, SectionHeading } from "@/components/ui/container";
import { Reveal } from "./Reveal";

const STEPS = [
  ["01", "Start from a frame", "Pick a mountain or road frame. It sets the standards everything else has to match: wheel size, fork travel, brake mounts, seatpost fit."],
  ["02", "Configure every part", "Swap components category by category. Price, weight and scores update instantly, and conflicts are flagged with the fix."],
  ["03", "Optimize and share", "Ask the assistant to hit a budget or suit your riding. Compare against other builds, find retailers, and publish to the community."],
];

export function HowItWorks() {
  return (
    <section className="border-y border-line bg-white py-24">
      <Container>
        <SectionHeading eyebrow="How it works" title="From idea to parts list in minutes." />
        <ol className="mt-14 grid gap-10 md:grid-cols-3">
          {STEPS.map(([n, title, text], i) => (
            <Reveal key={n} delay={i * 0.08}>
              <li className="border-t border-ink pt-6">
                <span className="font-mono text-xs text-muted">{n}</span>
                <h3 className="mt-3 font-display text-xl font-semibold tracking-[-0.015em]">{title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{text}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </Container>
    </section>
  );
}

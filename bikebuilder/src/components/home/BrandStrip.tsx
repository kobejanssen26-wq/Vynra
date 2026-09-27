import { Container } from "@/components/ui/container";

const BRANDS = ["Shimano", "SRAM", "Fox", "RockShox", "DT Swiss", "Trek", "Canyon", "Specialized", "Öhlins", "Maxxis"];

export function BrandStrip() {
  return (
    <section className="border-b border-line bg-paper">
      <Container className="flex flex-col gap-6 py-10 lg:flex-row lg:items-center lg:gap-12">
        <p className="eyebrow shrink-0 text-muted">Components from</p>
        <ul className="flex flex-wrap items-center gap-x-8 gap-y-3">
          {BRANDS.map((b) => (
            <li key={b} className="font-display text-[19px] font-semibold tracking-[-0.02em] text-ink/35">{b}</li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

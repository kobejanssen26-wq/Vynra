import { ArrowRight } from "lucide-react";
import { BuildCard } from "@/components/community/BuildCard";
import { ButtonLink } from "@/components/ui/button";
import { Container, SectionHeading } from "@/components/ui/container";
import { COMMUNITY_BUILDS } from "@/lib/community/data";
import { Reveal } from "./Reveal";

export function CommunityHighlight() {
  const top = [...COMMUNITY_BUILDS].sort((a, b) => b.likes - a.likes).slice(0, 3);
  return (
    <section className="bg-paper py-24 sm:py-32">
      <Container>
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading eyebrow="Community" title="Real builds from real riders." lead="Browse what others are riding, see every part and price, and copy any build into your own builder." />
          <ButtonLink href="/community" variant="outline">Explore builds <ArrowRight className="size-4" /></ButtonLink>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {top.map((b, i) => (
            <Reveal key={b.id} delay={i * 0.06}>
              <BuildCard build={b} className="h-full" />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

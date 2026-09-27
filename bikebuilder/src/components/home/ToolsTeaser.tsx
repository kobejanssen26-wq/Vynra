import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { PHOTOS } from "@/lib/images";

const TOOLS = [
  { href: "/compare", title: "Compare two bikes", text: "Weight, price, climbing, descending, travel and every component side by side — with a plain-language analysis.", image: PHOTOS.roadDuoCoast, alt: "Two road cyclists riding along the coast" },
  { href: "/marketplace", title: "Find the best price", text: "See which retailers list each part, compare prices and availability, and total up your build.", image: PHOTOS.roadStudio, alt: "Black road bike in a studio" },
];

export function ToolsTeaser() {
  return (
    <section className="border-t border-line bg-paper-2 py-24">
      <Container className="grid gap-5 md:grid-cols-2">
        {TOOLS.map((t) => (
          <Link key={t.href} href={t.href} className="group relative isolate flex min-h-[380px] flex-col justify-end overflow-hidden rounded-xl p-8 text-white">
            <Image src={t.image} alt={t.alt} fill sizes="(min-width:768px) 50vw, 100vw" className="-z-20 object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
            <h3 className="flex items-center gap-2 font-display text-2xl font-semibold tracking-[-0.02em]">
              {t.title} <ArrowUpRight className="size-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </h3>
            <p className="mt-2 max-w-md text-[15px] leading-relaxed text-white/75">{t.text}</p>
          </Link>
        ))}
      </Container>
    </section>
  );
}

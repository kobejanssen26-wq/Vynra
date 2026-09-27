import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { ButtonLink } from "@/components/ui/button";
import { PHOTOS } from "@/lib/images";

export function FinalCta() {
  return (
    <section className="relative isolate overflow-hidden bg-ink py-28 text-white">
      <Image src={PHOTOS.roadForest} alt="" fill sizes="100vw" className="-z-20 object-cover opacity-45" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/70 to-transparent" />
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-10">
        <h2 className="max-w-[16ch] font-display text-4xl font-semibold tracking-[-0.03em] sm:text-[56px] sm:leading-[1.04]">Your next bike starts with a frame.</h2>
        <p className="mt-5 max-w-lg text-lg text-white/70">Free to build, save and share. No account needed to start.</p>
        <div className="mt-9 flex flex-wrap gap-3">
          <ButtonLink href="/builder" variant="accent" size="lg">Start Building <ArrowRight className="size-4" /></ButtonLink>
          <ButtonLink href="/pricing" variant="inverse-outline" size="lg">See pricing</ButtonLink>
        </div>
      </div>
    </section>
  );
}

import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CommunityGrid } from "@/components/community/CommunityGrid";
import { RiderCard } from "@/components/community/RiderCard";
import { Avatar } from "@/components/ui/avatar";
import { Container } from "@/components/ui/container";
import { COMMUNITY_BUILDS, getUser, USERS } from "@/lib/community/data";
import { formatCount, formatEur, formatKg } from "@/lib/format";
import { computeStats } from "@/lib/stats";

export const metadata: Metadata = { title: "Community" };

export default function CommunityPage() {
  const featured = COMMUNITY_BUILDS.find((b) => b.id === "mountain-beast")!;
  const fs = computeStats(featured.discipline, featured.parts);
  const author = getUser(featured.authorId)!;

  return (
    <>
      <section className="border-b border-line bg-white">
        <Container className="py-14 sm:py-20">
          <p className="eyebrow text-accent">Community</p>
          <h1 className="mt-4 max-w-2xl font-display text-4xl font-semibold tracking-[-0.03em] sm:text-[52px] sm:leading-[1.05]">Builds from riders who&apos;ve done the research.</h1>
          <p className="mt-4 max-w-xl text-[17px] text-muted">Every part, price and weight is visible. Like it? Copy the build into your builder and make it yours.</p>
        </Container>
      </section>

      <Container className="py-12">
        <Link href={`/community/builds/${featured.id}`} className="group relative isolate grid overflow-hidden rounded-xl bg-ink text-white lg:grid-cols-[1.4fr_1fr]">
          <div className="relative aspect-[16/10] lg:aspect-auto lg:min-h-[420px]">
            <Image src={featured.coverImage!} alt="" fill priority sizes="(min-width:1024px) 60vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.02]" />
          </div>
          <div className="flex flex-col justify-center p-8 lg:p-12">
            <p className="eyebrow text-accent-bright">Featured build</p>
            <h2 className="mt-4 font-display text-4xl font-semibold tracking-[-0.03em]">{featured.name}</h2>
            <p className="mt-3 flex items-center gap-2 text-white/70"><Avatar user={author} size={22} /> {author.name} · {author.ridingStyle}</p>
            <p className="mt-4 text-[15px] leading-relaxed text-white/65">{featured.description}</p>
            <dl className="tabular mt-8 grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
              <div><dt className="text-[12px] text-white/45">Price</dt><dd className="font-display text-xl font-semibold">{formatEur(fs.priceEur)}</dd></div>
              <div><dt className="text-[12px] text-white/45">Weight</dt><dd className="font-display text-xl font-semibold">{formatKg(fs.weightKg)}</dd></div>
              <div><dt className="text-[12px] text-white/45">Likes</dt><dd className="font-display text-xl font-semibold">{formatCount(featured.likes)}</dd></div>
            </dl>
            <span className="mt-8 inline-flex items-center gap-2 text-[14px] font-medium text-accent-bright">View build <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></span>
          </div>
        </Link>
      </Container>

      <Container className="pb-8">
        <CommunityGrid builds={COMMUNITY_BUILDS} />
      </Container>

      <Container className="py-16" >
        <h2 id="riders" className="scroll-mt-24 font-display text-2xl font-semibold tracking-[-0.02em]">Riders to follow</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {USERS.map((u) => <RiderCard key={u.id} user={u} />)}
        </div>
      </Container>
    </>
  );
}

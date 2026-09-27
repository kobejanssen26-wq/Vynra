import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BikeVisual } from "@/components/bike/BikeVisual";
import { BuildActions } from "@/components/community/BuildActions";
import { BuildCard } from "@/components/community/BuildCard";
import { Comments } from "@/components/community/Comments";
import { FollowButton } from "@/components/community/FollowButton";
import { Avatar } from "@/components/ui/avatar";
import { Container } from "@/components/ui/container";
import { Meter } from "@/components/ui/meter";
import { CATEGORIES } from "@/lib/categories";
import { getComponent } from "@/lib/catalog";
import { checkCompatibility } from "@/lib/compatibility/engine";
import { buildsByAuthor, commentsFor, COMMUNITY_BUILDS, getCommunityBuild, getUser } from "@/lib/community/data";
import { formatCount, formatEur, formatGrams, formatKg } from "@/lib/format";
import { computeStats } from "@/lib/stats";

export function generateStaticParams() {
  return COMMUNITY_BUILDS.map((b) => ({ id: b.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const b = getCommunityBuild((await params).id);
  return { title: b ? b.name : "Build not found" };
}

export default async function BuildPage({ params }: { params: Promise<{ id: string }> }) {
  const build = getCommunityBuild((await params).id);
  if (!build) notFound();
  const author = getUser(build.authorId)!;
  const stats = computeStats(build.discipline, build.parts);
  const compat = checkCompatibility(build.discipline, build.parts);
  const more = buildsByAuthor(author.id).filter((b) => b.id !== build.id);

  return (
    <>
      <section className="relative isolate overflow-hidden bg-ink text-white">
        {build.coverImage && <Image src={build.coverImage} alt="" fill priority sizes="100vw" className="-z-20 object-cover opacity-60" />}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/50 to-ink/10" />
        <Container className="flex min-h-[460px] flex-col justify-end pb-12 pt-10">
          <Link href="/community" className="mb-auto inline-flex w-fit items-center gap-1.5 text-[13px] text-white/70 hover:text-white"><ArrowLeft className="size-3.5" /> Community</Link>
          <div className="flex flex-wrap gap-1.5">
            {build.tags.map((t) => <span key={t} className="rounded-sm bg-white/10 px-2 py-0.5 text-[12px] backdrop-blur">{t}</span>)}
          </div>
          <h1 className="mt-4 font-display text-5xl font-semibold tracking-[-0.035em] sm:text-7xl">{build.name}</h1>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-white/80">
            <Link href={`/community/riders/${author.username}`} className="flex items-center gap-2.5 hover:text-white">
              <Avatar user={author} size={32} />
              <span><span className="block text-[12px] text-white/50">Builder</span><span className="font-medium">{author.name}</span></span>
            </Link>
          </div>
        </Container>
      </section>

      <div className="border-b border-line bg-white">
        <Container className="flex flex-wrap items-center justify-between gap-6 py-5">
          <dl className="tabular flex flex-wrap gap-x-10 gap-y-3">
            {[
              ["Price", formatEur(stats.priceEur)],
              ["Weight", formatKg(stats.weightKg)],
              ["Likes", formatCount(build.likes)],
              ["Comments", formatCount(build.comments)],
              ["Terrain", stats.terrain],
            ].map(([k, v]) => (
              <div key={k}><dt className="text-[12px] text-muted">{k}</dt><dd className="font-display text-xl font-semibold">{v}</dd></div>
            ))}
          </dl>
          <BuildActions build={build} />
        </Container>
      </div>

      <Container className="grid gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-10">
          <div className="overflow-hidden rounded-xl border border-line bg-[radial-gradient(ellipse_at_50%_35%,#fff_0%,#f3f3ee_70%)] px-6 pt-8">
            <BikeVisual discipline={build.discipline} selection={build.parts} />
          </div>
          <div>
            <p className="text-[16px] leading-relaxed text-ink-3">{build.description}</p>
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold tracking-[-0.015em]">Parts list</h2>
            <div className="mt-4 overflow-x-auto rounded-lg border border-line bg-white">
              <table className="w-full min-w-[560px] text-[14px]">
                <thead className="border-b border-line bg-paper text-left text-[12px] uppercase tracking-wider text-muted">
                  <tr><th className="px-4 py-2.5 font-medium">Category</th><th className="px-4 py-2.5 font-medium">Component</th><th className="px-4 py-2.5 text-right font-medium">Weight</th><th className="px-4 py-2.5 text-right font-medium">Price</th></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {CATEGORIES.map((cat) => {
                    const c = getComponent(build.parts[cat.id]);
                    if (!c) return null;
                    return (
                      <tr key={cat.id}>
                        <td className="px-4 py-3 text-muted">{cat.label}</td>
                        <td className="px-4 py-3"><span className="text-muted">{c.brand}</span> <span className="font-medium">{c.model}</span></td>
                        <td className="tabular px-4 py-3 text-right text-muted">{formatGrams(c.weightG)}</td>
                        <td className="tabular px-4 py-3 text-right font-medium">{c.includedWith ? "Incl." : formatEur(c.priceEur)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t border-line bg-paper font-medium">
                  <tr><td className="px-4 py-3" colSpan={2}>Total <span className="font-normal text-muted">(weight incl. ≈{formatGrams(stats.hardwareAllowanceG)} small parts)</span></td><td className="tabular px-4 py-3 text-right">{formatKg(stats.weightKg)}</td><td className="tabular px-4 py-3 text-right">{formatEur(stats.priceEur)}</td></tr>
                </tfoot>
              </table>
            </div>
          </div>
          <Comments buildId={build.id} seed={commentsFor(build.id)} total={build.comments} />
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-lg border border-line bg-white p-5">
            <h2 className="eyebrow text-muted">Build scores</h2>
            <div className="mt-4 space-y-4">
              {[["Performance", stats.performance, 100], ["Comfort", stats.comfort, 100], ["Durability", stats.durability, 100], ["Climbing", stats.climbing, 10], ["Descending", stats.descending, 10]].map(([k, v, max]) => (
                <div key={k as string}>
                  <div className="flex justify-between text-[13px]"><span className="text-muted">{k}</span><span className="tabular font-medium">{v}{max === 100 ? (k === "Performance" ? "/100" : "%") : "/10"}</span></div>
                  <Meter value={v as number} max={max as number} className="mt-1.5" tone={k === "Performance" ? "accent" : "ink"} />
                </div>
              ))}
            </div>
            <p className="mt-5 border-t border-line pt-4 text-[13px] text-muted">
              {compat.errorCount === 0 ? `✓ All ${compat.rules.filter((r) => r.applicable).length} compatibility checks pass` : `${compat.errorCount} compatibility issue(s)`}
            </p>
          </div>
          <div className="rounded-lg border border-line bg-white p-5">
            <div className="flex items-center gap-3">
              <Avatar user={author} size={44} />
              <div className="min-w-0 flex-1">
                <Link href={`/community/riders/${author.username}`} className="font-medium hover:underline">{author.name}</Link>
                <p className="text-[12.5px] text-muted">{author.ridingStyle} · {author.location}</p>
              </div>
              <FollowButton userId={author.id} />
            </div>
            <p className="mt-4 text-[13.5px] leading-relaxed text-muted">{author.bio}</p>
          </div>
        </aside>
      </Container>

      {more.length > 0 && (
        <Container className="pb-20">
          <h2 className="font-display text-xl font-semibold tracking-[-0.015em]">More from {author.name}</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((b) => <BuildCard key={b.id} build={b} />)}
          </div>
        </Container>
      )}
    </>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BuildCard } from "@/components/community/BuildCard";
import { FollowButton, FollowerCount } from "@/components/community/FollowButton";
import { Avatar } from "@/components/ui/avatar";
import { Container } from "@/components/ui/container";
import { DataNote } from "@/components/ui/note";
import { BUILD_COUNTS, buildsByAuthor, getUserByUsername, USERS } from "@/lib/community/data";
import { formatCount } from "@/lib/format";

export function generateStaticParams() {
  return USERS.map((u) => ({ username: u.username }));
}

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const u = getUserByUsername((await params).username);
  return { title: u ? `${u.name} · ${u.ridingStyle}` : "Rider not found" };
}

export default async function RiderPage({ params }: { params: Promise<{ username: string }> }) {
  const user = getUserByUsername((await params).username);
  if (!user) notFound();
  const builds = buildsByAuthor(user.id);
  const count = BUILD_COUNTS[user.id] ?? builds.length;

  return (
    <>
      <section className="border-b border-line bg-white">
        <Container className="flex flex-col gap-8 py-14 md:flex-row md:items-end">
          <Avatar user={user} size={112} className="text-5xl" />
          <div className="min-w-0 flex-1">
            <p className="eyebrow text-accent">{user.ridingStyle}</p>
            <h1 className="mt-2 font-display text-5xl font-semibold tracking-[-0.035em]">{user.name}</h1>
            <p className="mt-1 text-muted">{user.location} · Joined {new Date(user.joined).toLocaleDateString("en-IE", { month: "long", year: "numeric" })}</p>
            <p className="mt-4 max-w-xl text-[15.5px] leading-relaxed text-ink-3">{user.bio}</p>
          </div>
          <FollowButton userId={user.id} size="md" />
        </Container>
        <Container>
          <dl className="tabular grid grid-cols-2 border-t border-line sm:grid-cols-4">
            {[
              ["Builds", formatCount(count)],
              ["Followers", <FollowerCount key="f" userId={user.id} base={user.followers} />],
              ["Following", formatCount(user.following)],
              ["Likes", formatCount(user.likes)],
            ].map(([k, v]) => (
              <div key={k as string} className="py-5 pr-6">
                <dt className="text-[12px] text-muted">{k}</dt>
                <dd className="font-display text-2xl font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>
      <Container className="py-12">
        <h2 className="font-display text-xl font-semibold tracking-[-0.015em]">Builds</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {builds.map((b) => <BuildCard key={b.id} build={b} />)}
        </div>
        {count > builds.length && <DataNote className="mt-6">Showing {builds.length} of {count} builds in this preview.</DataNote>}
      </Container>
    </>
  );
}

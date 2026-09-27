import { Heart, MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { getUser } from "@/lib/community/data";
import { formatCount, formatEur, formatKg } from "@/lib/format";
import { computeStats } from "@/lib/stats";
import type { CommunityBuild } from "@/lib/types";
import { cn } from "@/lib/utils";

export function BuildCard({ build, className, priority }: { build: CommunityBuild; className?: string; priority?: boolean }) {
  const stats = computeStats(build.discipline, build.parts);
  const author = getUser(build.authorId)!;
  return (
    <Link
      href={`/community/builds/${build.id}`}
      className={cn("group flex flex-col overflow-hidden rounded-lg border border-line bg-white shadow-card transition-shadow duration-300 hover:shadow-lift", className)}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-ink">
        {build.coverImage && (
          <Image
            src={build.coverImage}
            alt=""
            fill
            priority={priority}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-3 left-3 flex gap-1.5">
          {build.tags.slice(0, 2).map((t) => (
            <span key={t} className="rounded-sm bg-black/55 px-1.5 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">{t}</span>
          ))}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-[17px] font-semibold tracking-[-0.01em] text-ink">{build.name}</h3>
          <span className="tabular font-display text-[15px] font-semibold text-ink">{formatEur(stats.priceEur)}</span>
        </div>
        <div className="mt-1 flex items-center gap-2 text-[13px] text-muted">
          <Avatar user={author} size={18} />
          <span>{author.name}</span>
          <span className="text-line-strong">·</span>
          <span className="tabular">{formatKg(stats.weightKg)}</span>
          <span className="text-line-strong">·</span>
          <span>{stats.terrain}</span>
        </div>
        <div className="mt-auto flex items-center gap-4 pt-4 text-[12.5px] text-muted">
          <span className="inline-flex items-center gap-1.5 tabular"><Heart className="size-3.5" />{formatCount(build.likes)}</span>
          <span className="inline-flex items-center gap-1.5 tabular"><MessageCircle className="size-3.5" />{formatCount(build.comments)}</span>
        </div>
      </div>
    </Link>
  );
}

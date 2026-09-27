"use client";

import { Bookmark, Copy, GitCompare, Heart, Share2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonClass } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import type { CommunityBuild } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useBuilder } from "@/store/builder";

export function BuildActions({ build }: { build: CommunityBuild }) {
  const router = useRouter();
  const liked = useBuilder((s) => s.liked.includes(build.id));
  const saved = useBuilder((s) => s.bookmarked.includes(build.id));
  const { toggleLike, toggleBookmark, loadBuild } = useBuilder.getState();

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: build.name, url });
      else {
        await navigator.clipboard.writeText(url);
        toast("Link copied to clipboard");
      }
    } catch {
      /* user cancelled */
    }
  };

  const copy = () => {
    loadBuild(build, { copy: true });
    toast(`“${build.name}” copied to your builder`);
    router.push("/builder");
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant={liked ? "primary" : "outline"} onClick={() => toggleLike(build.id)} aria-pressed={liked}>
        <Heart className={cn("size-4", liked && "fill-current text-accent-bright")} />
        <span className="tabular">{(build.likes + (liked ? 1 : 0)).toLocaleString("en-IE")}</span>
      </Button>
      <Button variant={saved ? "primary" : "outline"} onClick={() => toggleBookmark(build.id)} aria-pressed={saved}>
        <Bookmark className={cn("size-4", saved && "fill-current")} /> {saved ? "Saved" : "Save"}
      </Button>
      <Button variant="outline" onClick={share}>
        <Share2 className="size-4" /> Share
      </Button>
      <Link href={`/compare?a=current&b=${build.id}`} className={buttonClass("outline")}>
        <GitCompare className="size-4" /> Compare
      </Link>
      <Button variant="accent" onClick={copy}>
        <Copy className="size-4" /> Copy Build
      </Button>
    </div>
  );
}

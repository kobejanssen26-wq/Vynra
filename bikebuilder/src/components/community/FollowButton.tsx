"use client";

import { Check, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBuilder } from "@/store/builder";

export function FollowButton({ userId, className, size = "sm" }: { userId: string; className?: string; size?: "sm" | "md" }) {
  const following = useBuilder((s) => s.following.includes(userId));
  return (
    <Button size={size} variant={following ? "outline" : "primary"} className={cn(className)} onClick={() => useBuilder.getState().toggleFollow(userId)} aria-pressed={following}>
      {following ? <Check className="size-3.5" /> : <UserPlus className="size-3.5" />}
      {following ? "Following" : "Follow"}
    </Button>
  );
}

/** Follower count that reflects the viewer's own follow. */
export function FollowerCount({ userId, base }: { userId: string; base: number }) {
  const following = useBuilder((s) => s.following.includes(userId));
  return <>{(base + (following ? 1 : 0)).toLocaleString("en-IE")}</>;
}

import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { BUILD_COUNTS } from "@/lib/community/data";
import type { User } from "@/lib/types";
import { FollowButton, FollowerCount } from "./FollowButton";

export function RiderCard({ user }: { user: User }) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-line bg-white p-4">
      <Link href={`/community/riders/${user.username}`} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar user={user} size={44} />
        <div className="min-w-0">
          <p className="font-medium text-ink">{user.name}</p>
          <p className="truncate text-[12.5px] text-muted">{user.ridingStyle} · {user.location}</p>
          <p className="tabular mt-0.5 text-[12px] text-subtle">{BUILD_COUNTS[user.id] ?? 0} builds · <FollowerCount userId={user.id} base={user.followers} /> followers</p>
        </div>
      </Link>
      <FollowButton userId={user.id} />
    </div>
  );
}

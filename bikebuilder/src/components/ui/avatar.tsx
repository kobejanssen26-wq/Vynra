import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Initials avatar — no stock portraits of people who don't exist. */
export function Avatar({ user, size = 36, className }: { user: Pick<User, "name" | "avatar">; size?: number; className?: string }) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-display font-semibold text-white", className)}
      style={{ width: size, height: size, background: user.avatar, fontSize: size * 0.4 }}
      aria-hidden
    >
      {user.name.slice(0, 1)}
    </span>
  );
}

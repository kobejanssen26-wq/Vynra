"use client";

import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DataNote } from "@/components/ui/note";
import { getUser } from "@/lib/community/data";
import { timeAgo } from "@/lib/format";
import type { Comment } from "@/lib/types";
import { CURRENT_USER_ID, useBuilder } from "@/store/builder";

const YOU = { name: "You", avatar: "#0e0f0f" };

export function Comments({ buildId, seed, total }: { buildId: string; seed: Comment[]; total: number }) {
  const allMine = useBuilder((s) => s.comments);
  const mine = useMemo(() => allMine.filter((c) => c.buildId === buildId), [allMine, buildId]);
  const [body, setBody] = useState("");
  const all = [...seed, ...mine];
  return (
    <section>
      <h2 className="font-display text-xl font-semibold tracking-[-0.015em]">
        Comments <span className="tabular text-muted">{(total + mine.length).toLocaleString("en-IE")}</span>
      </h2>
      <form
        className="mt-5 flex gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!body.trim()) return;
          useBuilder.getState().addComment(buildId, body.trim());
          setBody("");
        }}
      >
        <Avatar user={YOU} size={36} />
        <div className="flex-1">
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="Ask about a part or share feedback…" className="w-full resize-none rounded-md border border-line bg-white px-3 py-2.5 text-[14px] outline-none focus:border-ink/40" aria-label="Write a comment" />
          <div className="mt-2 flex items-center justify-between gap-3">
            <DataNote>Comments are saved in this browser until accounts are available.</DataNote>
            <Button size="sm" type="submit" disabled={!body.trim()}>Post</Button>
          </div>
        </div>
      </form>
      <ul className="mt-6 divide-y divide-line">
        {all.map((c) => {
          const u = c.authorId === CURRENT_USER_ID ? YOU : getUser(c.authorId);
          return (
            <li key={c.id} className="flex gap-3 py-4">
              <Avatar user={u ?? YOU} size={32} />
              <div>
                <p className="text-[13px]"><span className="font-medium text-ink">{u?.name}</span> <span className="text-subtle" suppressHydrationWarning>· {timeAgo(c.createdAt)}</span></p>
                <p className="mt-1 text-[14px] leading-relaxed text-ink-3">{c.body}</p>
              </div>
            </li>
          );
        })}
      </ul>
      {total > all.length - mine.length && <p className="text-[13px] text-muted">Showing {all.length} of {(total + mine.length).toLocaleString("en-IE")} comments.</p>}
    </section>
  );
}

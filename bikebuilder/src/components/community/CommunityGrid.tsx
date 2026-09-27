"use client";

import { useMemo, useState } from "react";
import type { CommunityBuild, Discipline } from "@/lib/types";
import { cn } from "@/lib/utils";
import { BuildCard } from "./BuildCard";

type Filter = "all" | Discipline;
type Sort = "popular" | "newest";

export function CommunityGrid({ builds }: { builds: CommunityBuild[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("popular");
  const list = useMemo(
    () =>
      builds
        .filter((b) => filter === "all" || b.discipline === filter)
        .sort((a, b) => (sort === "popular" ? b.likes - a.likes : b.createdAt.localeCompare(a.createdAt))),
    [builds, filter, sort],
  );
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <Segmented value={filter} onChange={setFilter} options={[["all", "All builds"], ["mtb", "Mountain"], ["road", "Road"]]} />
        <div className="ml-auto">
          <Segmented value={sort} onChange={setSort} options={[["popular", "Most liked"], ["newest", "Newest"]]} />
        </div>
      </div>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((b) => (
          <BuildCard key={b.id} build={b} />
        ))}
      </div>
    </div>
  );
}

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="flex rounded-md border border-line bg-white p-0.5 text-[13px]">
      {options.map(([v, label]) => (
        <button key={v} onClick={() => onChange(v)} className={cn("rounded-[5px] px-3 py-1.5 font-medium", value === v ? "bg-ink text-white" : "text-muted hover:text-ink")}>
          {label}
        </button>
      ))}
    </div>
  );
}

"use client";

import { ArrowLeft, Check, Minus, Plus, ShoppingBag, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { SeverityIcon, StatusBadge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { categoryMeta } from "@/lib/categories";
import { getComponent } from "@/lib/catalog";
import { candidateStatus } from "@/lib/compatibility/engine";
import { formatEur, formatEurDelta, formatGramDelta, formatGrams } from "@/lib/format";
import { alternatives, componentOpinion, utility } from "@/lib/recommend/engine";
import type { PreferenceProfile } from "@/lib/recommend/profiles";
import type { CategoryId, Discipline, PartSelection } from "@/lib/types";
import { cn } from "@/lib/utils";

export type SheetState = { mode: "detail"; category: CategoryId; componentId: string; from?: "picker" } | { mode: "picker"; category: CategoryId } | null;

interface Props {
  state: SheetState;
  onState: (s: SheetState) => void;
  discipline: Discipline;
  parts: PartSelection;
  profile: PreferenceProfile;
  onSelect: (category: CategoryId, id: string) => void;
}

export function ComponentSheet({ state, onState, discipline, parts, profile, onSelect }: Props) {
  const close = () => onState(null);
  const title =
    state?.mode === "picker" ? `Replace ${categoryMeta(state.category).label.toLowerCase()}` : state ? categoryMeta(state.category).label : "";
  return (
    <Sheet open={!!state} onClose={close} title={title} width={560}>
      {state?.mode === "detail" && (
        <DetailView
          key={state.componentId}
          discipline={discipline}
          parts={parts}
          profile={profile}
          category={state.category}
          componentId={state.componentId}
          onBack={state.from === "picker" ? () => onState({ mode: "picker", category: state.category }) : undefined}
          onView={(id) => onState({ mode: "detail", category: state.category, componentId: id, from: state.from })}
          onReplace={() => onState({ mode: "picker", category: state.category })}
          onUse={(id) => {
            onSelect(state.category, id);
            close();
          }}
        />
      )}
      {state?.mode === "picker" && (
        <PickerView
          discipline={discipline}
          parts={parts}
          profile={profile}
          category={state.category}
          onView={(id) => onState({ mode: "detail", category: state.category, componentId: id, from: "picker" })}
          onUse={(id) => {
            onSelect(state.category, id);
            close();
          }}
        />
      )}
    </Sheet>
  );
}

function DetailView({
  discipline,
  parts,
  profile,
  category,
  componentId,
  onBack,
  onView,
  onReplace,
  onUse,
}: {
  discipline: Discipline;
  parts: PartSelection;
  profile: PreferenceProfile;
  category: CategoryId;
  componentId: string;
  onBack?: () => void;
  onView: (id: string) => void;
  onReplace: () => void;
  onUse: (id: string) => void;
}) {
  const c = getComponent(componentId)!;
  const isCurrent = parts[category] === componentId;
  const { severity, issues } = useMemo(() => candidateStatus(discipline, parts, category, componentId), [discipline, parts, category, componentId]);
  const opinion = useMemo(() => componentOpinion(discipline, parts, c, profile), [discipline, parts, c, profile]);
  const recs = useMemo(
    () =>
      alternatives(discipline, parts, category)
        .filter((a) => a.component.id !== componentId && a.status !== "error")
        .sort((a, b) => utility(b.component, profile) - utility(a.component, profile))
        .slice(0, 3),
    [discipline, parts, category, componentId, profile],
  );
  const current = getComponent(parts[category]);
  const keySpecs = c.specs.filter((s) => s.label !== "Weight").slice(0, 4);

  return (
    <div className="pb-28">
      <div className="px-6 pt-6">
        {onBack && (
          <button onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink">
            <ArrowLeft className="size-3.5" /> All options
          </button>
        )}
        <p className="text-[13px] font-medium text-muted">{c.brand}</p>
        <h2 className="mt-1 font-display text-[28px] font-semibold leading-tight tracking-[-0.025em]">{c.model}</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={severity} />
          {isCurrent && <span className="rounded-sm bg-ink px-1.5 py-0.5 text-[11.5px] font-medium text-white">In your build</span>}
          <span className="text-[12.5px] text-muted">Tier {c.tier}/5</span>
        </div>
        <p className="mt-5 font-display text-[34px] font-semibold tracking-[-0.03em]">{c.includedWith ? "Included" : formatEur(c.priceEur)}</p>
        {c.includedWith && <p className="text-[13px] text-muted">Supplied with the {c.includedWith}.</p>}
        {!isCurrent && current && (
          <p className="tabular mt-1 text-[13px] text-muted">
            {formatEurDelta(c.priceEur - current.priceEur)} · {formatGramDelta(c.weightG - current.weightG)} vs. {current.model}
          </p>
        )}
      </div>

      <dl className="mx-6 mt-6 grid grid-cols-2 overflow-hidden rounded-lg border border-line bg-white">
        <Spec label="Weight" value={formatGrams(c.weightG)} />
        {keySpecs.map((s) => (
          <Spec key={s.label} label={s.label} value={s.value} />
        ))}
        <Spec label="Compatibility" value={severity === "error" ? "✕ Incompatible" : severity === "warning" ? "! Check fit" : "✓ Compatible"} tone={severity} />
      </dl>

      {issues.length > 0 && (
        <ul className="mx-6 mt-3 space-y-2">
          {issues.map((i) => (
            <li key={i.ruleId + i.message} className="flex gap-2.5 rounded-md border border-line bg-white px-3 py-2.5 text-[13px]">
              <SeverityIcon severity={i.severity} className="mt-0.5" />
              <span>
                <span className="text-ink">{i.message}</span>
                {i.fix && <span className="text-muted"> {i.fix}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}

      <section className="mx-6 mt-6 rounded-lg bg-ink p-5 text-white">
        <p className="flex items-center gap-1.5 text-[12px] font-medium text-accent-bright">
          <Sparkles className="size-3.5" /> AI opinion
        </p>
        <p className="mt-2 text-[14.5px] leading-relaxed text-white/85">{opinion}</p>
        <p className="mt-3 text-[11.5px] text-white/40">Computed from catalog specs and your riding profile.</p>
      </section>

      <section className="mx-6 mt-6 grid gap-4 sm:grid-cols-2">
        <ProsCons title="Pros" items={c.pros} icon={<Plus className="size-3.5 text-accent" strokeWidth={2.5} />} />
        <ProsCons title="Cons" items={c.cons.length ? c.cons : ["None noted"]} icon={<Minus className="size-3.5 text-danger" strokeWidth={2.5} />} />
      </section>

      <section className="mx-6 mt-6">
        <h3 className="eyebrow text-muted">About</h3>
        <p className="mt-2 text-[14.5px] leading-relaxed text-ink-3">{c.summary}</p>
        {c.specs.length > keySpecs.length && (
          <dl className="mt-4 divide-y divide-line border-y border-line text-[13.5px]">
            {c.specs.map((s) => (
              <div key={s.label} className="flex justify-between gap-4 py-2">
                <dt className="text-muted">{s.label}</dt>
                <dd className="text-right text-ink">{s.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {recs.length > 0 && (
        <section className="mx-6 mt-8">
          <h3 className="eyebrow text-muted">Recommended alternatives</h3>
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-lg border border-line bg-white">
            {recs.map((a) => (
              <li key={a.component.id}>
                <button onClick={() => onView(a.component.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-paper">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium">{a.component.brand} {a.component.model}</p>
                    <p className="tabular text-[12.5px] text-muted">{formatEur(a.component.priceEur)} · {formatGrams(a.component.weightG)}</p>
                  </div>
                  <span className={cn("tabular text-[12.5px] font-medium", a.component.priceEur - c.priceEur > 0 ? "text-ink-3" : "text-accent-strong")}>
                    {formatEurDelta(a.component.priceEur - c.priceEur)}
                  </span>
                  {a.isCurrent && <span className="text-[11px] text-muted">current</span>}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="fixed bottom-0 right-0 flex w-full max-w-[560px] gap-2 border-t border-line bg-paper/95 px-6 py-4 backdrop-blur">
        {isCurrent ? (
          <Button onClick={onReplace} className="flex-1">Replace</Button>
        ) : (
          <Button onClick={() => onUse(c.id)} className="flex-1" variant={severity === "error" ? "outline" : "primary"}>
            <Check className="size-4" /> {severity === "error" ? "Use anyway" : "Use this component"}
          </Button>
        )}
        <Link href={`/marketplace#${c.id}`} className={buttonClass("outline", "md")}>
          <ShoppingBag className="size-4" /> Where to buy
        </Link>
      </div>
    </div>
  );
}

function Spec({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="border-b border-r border-line px-4 py-3 [&:nth-child(2n)]:border-r-0 [&:nth-last-child(-n+2)]:border-b-0">
      <dt className="text-[11.5px] uppercase tracking-wider text-muted">{label}</dt>
      <dd className={cn("mt-0.5 text-[14.5px] font-medium", tone === "error" ? "text-danger" : tone === "warning" ? "text-warn" : tone ? "text-accent-strong" : "text-ink")}>{value}</dd>
    </div>
  );
}

function ProsCons({ title, items, icon }: { title: string; items: string[]; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <h3 className="eyebrow text-muted">{title}</h3>
      <ul className="mt-2.5 space-y-1.5 text-[13.5px]">
        {items.map((i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-1">{icon}</span>
            <span className="text-ink-3">{i}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type Sort = "recommended" | "price" | "weight";

function PickerView({
  discipline,
  parts,
  profile,
  category,
  onView,
  onUse,
}: {
  discipline: Discipline;
  parts: PartSelection;
  profile: PreferenceProfile;
  category: CategoryId;
  onView: (id: string) => void;
  onUse: (id: string) => void;
}) {
  const [sort, setSort] = useState<Sort>("recommended");
  const [onlyCompatible, setOnlyCompatible] = useState(false);
  const list = useMemo(() => {
    const all = alternatives(discipline, parts, category).filter((a) => !onlyCompatible || a.status !== "error");
    const rank = (s: string) => (s === "error" ? 2 : s === "warning" ? 1 : 0);
    return all.sort((a, b) => {
      if (sort === "price") return a.component.priceEur - b.component.priceEur;
      if (sort === "weight") return a.component.weightG - b.component.weightG;
      return rank(a.status) - rank(b.status) || utility(b.component, profile) - utility(a.component, profile);
    });
  }, [discipline, parts, category, sort, onlyCompatible, profile]);

  return (
    <div>
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-line bg-paper px-6 py-3">
        <div className="flex rounded-md border border-line bg-white p-0.5 text-[12.5px]">
          {(["recommended", "price", "weight"] as Sort[]).map((s) => (
            <button key={s} onClick={() => setSort(s)} className={cn("rounded-[5px] px-2.5 py-1 capitalize", sort === s ? "bg-ink text-white" : "text-muted hover:text-ink")}>
              {s}
            </button>
          ))}
        </div>
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-[12.5px] text-muted">
          <input type="checkbox" checked={onlyCompatible} onChange={(e) => setOnlyCompatible(e.target.checked)} className="accent-[var(--color-accent)]" />
          Compatible only
        </label>
      </div>
      <ul className="divide-y divide-line">
        {list.map((a) => (
          <li key={a.component.id} className={cn("flex items-center gap-3 px-6 py-4", a.isCurrent && "bg-accent-soft/50")}>
            <button className="min-w-0 flex-1 text-left" onClick={() => onView(a.component.id)}>
              <div className="flex items-center gap-2">
                <p className="truncate text-[14.5px] font-medium text-ink">
                  <span className="text-muted">{a.component.brand}</span> {a.component.model}
                </p>
              </div>
              <div className="tabular mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted">
                <span className="font-medium text-ink">{a.component.includedWith ? "Included" : formatEur(a.component.priceEur)}</span>
                <span>{formatGrams(a.component.weightG)}</span>
                {!a.isCurrent && (
                  <>
                    <span className={a.deltaPriceEur <= 0 ? "text-accent-strong" : ""}>{formatEurDelta(a.deltaPriceEur)}</span>
                    <span className={a.deltaWeightG <= 0 ? "text-accent-strong" : ""}>{formatGramDelta(a.deltaWeightG)}</span>
                  </>
                )}
              </div>
              {a.status !== "ok" && a.status !== "info" && a.statusMessage && <p className={cn("mt-1.5 text-[12px]", a.status === "error" ? "text-danger" : "text-warn")}>{a.statusMessage}</p>}
            </button>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <StatusBadge status={a.status} />
              {a.isCurrent ? (
                <span className="text-[12px] font-medium text-accent-strong">Selected</span>
              ) : (
                <Button size="sm" variant={a.status === "error" ? "outline" : "primary"} onClick={() => onUse(a.component.id)}>
                  Select
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

"use client";

import { ChevronDown, ExternalLink, ShoppingCart, Truck } from "lucide-react";
import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { CATEGORIES } from "@/lib/categories";
import { getComponent } from "@/lib/catalog";
import { formatEur, timeAgo } from "@/lib/format";
import { demoOffers, getRetailer, RETAILERS } from "@/lib/marketplace/offers";
import type { Offer } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useBuilder, useStoreHydrated } from "@/store/builder";

const AVAIL: Record<Offer["availability"], { label: string; tone: "accent" | "warn" | "neutral" | "danger" }> = {
  "in-stock": { label: "In stock", tone: "accent" },
  "low-stock": { label: "Low stock", tone: "warn" },
  backorder: { label: "Backorder", tone: "neutral" },
  "out-of-stock": { label: "Out of stock", tone: "danger" },
};

const buyable = (o: Offer) => o.availability === "in-stock" || o.availability === "low-stock";

export function MarketplaceView() {
  const hydrated = useStoreHydrated();
  const build = useBuilder((s) => s.build);
  const [open, setOpen] = useState<string | null>(null);
  // Demo offers depend on the current time, so only compute them in the browser.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);

  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id) setOpen(id);
  }, []);

  const rows = useMemo(
    () =>
      CATEGORIES.map((cat) => {
        const c = getComponent(build.parts[cat.id]);
        if (!c) return null;
        const offers = now ? demoOffers(c, now) : [];
        const best = offers.find(buyable);
        return { cat, c, offers, best };
      }).filter((r): r is NonNullable<typeof r> => !!r),
    [build.parts, now],
  );

  const listTotal = rows.reduce((n, r) => n + r.c.priceEur, 0);
  const cheapest = rows.reduce((n, r) => n + (r.best?.priceEur ?? r.c.priceEur), 0);
  const unavailable = rows.filter((r) => !r.best && !r.c.includedWith).length;

  return (
    <div className={hydrated ? "" : "opacity-0"}>
      <section className="border-b border-line bg-white">
        <Container className="grid gap-10 py-12 lg:grid-cols-[1fr_380px] lg:items-end">
          <div>
            <p className="eyebrow text-accent">Marketplace</p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">Where to buy “{build.name}”.</h1>
            <p className="mt-4 max-w-xl text-[16px] text-muted">
              Every part in your current build, with retailer offers. <Link href="/builder" className="text-ink underline underline-offset-2">Edit the build</Link> to change the list.
            </p>
            <div className="mt-6 rounded-lg border border-warn/25 bg-warn-soft px-4 py-3 text-[13.5px] leading-relaxed text-ink-3">
              <strong className="font-semibold text-ink">Demo prices.</strong> Retailer price feeds aren&apos;t connected yet, so offers below are generated around the catalog price to show how the marketplace will work. Retailer buttons open a product search on the retailer&apos;s site.
            </div>
          </div>
          <div className="rounded-xl border border-line bg-paper p-6">
            <dl className="space-y-4">
              <div className="flex items-baseline justify-between">
                <dt className="text-[13px] text-muted">Total build price</dt>
                <dd className="tabular font-display text-2xl font-semibold">{formatEur(listTotal)}</dd>
              </div>
              <div className="flex items-baseline justify-between">
                <dt className="text-[13px] text-muted">Cheapest available price</dt>
                <dd className="tabular font-display text-2xl font-semibold text-accent-strong">{now ? formatEur(cheapest) : "—"}</dd>
              </div>
              {now && cheapest < listTotal && <p className="tabular text-right text-[13px] text-accent-strong">Save {formatEur(listTotal - cheapest)} by mixing retailers</p>}
              {unavailable > 0 && <p className="text-[12.5px] text-warn">{unavailable} part(s) currently unavailable at listed retailers — catalog price used.</p>}
            </dl>
            <Button className="mt-5 w-full" disabled title="No retailer cart integration is available yet">
              <ShoppingCart className="size-4" /> Add all components to retailer cart
            </Button>
            <p className="mt-2 text-center text-[12px] text-muted">Available once retailer cart integrations are live.</p>
          </div>
        </Container>
      </section>

      <Container className="py-10">
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full min-w-[860px] text-[14px]">
            <thead className="border-b border-line bg-paper text-left text-[12px] uppercase tracking-wider text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Component</th>
                <th className="px-5 py-3 font-medium">Best offer</th>
                <th className="px-5 py-3 font-medium">Availability</th>
                <th className="px-5 py-3 font-medium">Shipping</th>
                <th className="px-5 py-3 font-medium">Updated</th>
                <th className="px-5 py-3 text-right font-medium">Price</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map(({ cat, c, offers, best }) => {
                const expanded = open === c.id;
                const r = best ? getRetailer(best.retailerId) : undefined;
                return (
                  <Fragment key={cat.id}>
                    <tr id={c.id} className={cn("scroll-mt-24 align-middle", expanded && "bg-paper")}>
                      <td className="px-5 py-4">
                        <p className="eyebrow text-muted">{cat.label}</p>
                        <p className="mt-1 font-medium">{c.brand} {c.model}</p>
                        <p className="tabular text-[12.5px] text-subtle">List {c.includedWith ? "included" : formatEur(c.priceEur)}</p>
                      </td>
                      {c.includedWith ? (
                        <td colSpan={5} className="px-5 py-4 text-muted">Included with the {c.includedWith}</td>
                      ) : !now ? (
                        <td colSpan={5} className="px-5 py-4 text-muted">Loading offers…</td>
                      ) : best && r ? (
                        <>
                          <td className="px-5 py-4">
                            <p className="font-medium">Buy at {r.name}</p>
                            <p className="text-[12.5px] text-muted">{offers.length} retailer{offers.length > 1 ? "s" : ""}</p>
                          </td>
                          <td className="px-5 py-4"><Badge tone={AVAIL[best.availability].tone}>{AVAIL[best.availability].label}</Badge></td>
                          <td className="px-5 py-4 text-[13px] text-muted"><span className="inline-flex items-center gap-1.5"><Truck className="size-3.5" />{best.shipping}</span></td>
                          <td className="px-5 py-4 text-[13px] text-muted">{timeAgo(best.updatedAt, now)}</td>
                          <td className="tabular px-5 py-4 text-right font-display text-[17px] font-semibold">{formatEur(best.priceEur)}</td>
                        </>
                      ) : (
                        <td colSpan={5} className="px-5 py-4 text-muted">Not currently available at listed retailers</td>
                      )}
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {best && r && (
                            <a href={best.url} target="_blank" rel="noopener noreferrer nofollow" className={buttonClass("primary", "sm")}>
                              {r.name} <ExternalLink className="size-3.5" />
                            </a>
                          )}
                          {offers.length > 0 && (
                            <button onClick={() => setOpen(expanded ? null : c.id)} className="rounded-md p-1.5 text-muted hover:bg-ink/5 hover:text-ink" aria-expanded={expanded} aria-label={`All offers for ${c.model}`}>
                              <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expanded &&
                      offers.map((o) => {
                        const rr = getRetailer(o.retailerId);
                        return (
                          <tr key={o.retailerId} className="bg-paper/60 text-[13.5px]">
                            <td className="px-5 py-2.5 pl-10 text-muted">{rr.name} <span className="text-subtle">· {rr.country}</span></td>
                            <td className="px-5 py-2.5" />
                            <td className="px-5 py-2.5"><Badge tone={AVAIL[o.availability].tone}>{AVAIL[o.availability].label}</Badge></td>
                            <td className="px-5 py-2.5 text-muted">{o.shipping}</td>
                            <td className="px-5 py-2.5 text-muted">{timeAgo(o.updatedAt, now ?? undefined)}</td>
                            <td className="tabular px-5 py-2.5 text-right font-medium">{formatEur(o.priceEur)}</td>
                            <td className="px-5 py-2.5 text-right">
                              <a href={o.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-[13px] font-medium text-ink hover:underline">
                                Visit <ExternalLink className="size-3" />
                              </a>
                            </td>
                          </tr>
                        );
                      })}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-8">
          <h2 className="eyebrow text-muted">Retailers</h2>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[14px]">
            {RETAILERS.map((r) => (
              <li key={r.id}><a href={r.url} target="_blank" rel="noopener noreferrer" className="text-ink-3 hover:text-ink hover:underline">{r.name}</a> <span className="text-subtle">· {r.country}{r.freeShippingFromEur ? ` · free shipping from €${r.freeShippingFromEur}` : ""}</span></li>
            ))}
          </ul>
          <p className="mt-3 text-[12.5px] text-muted">Shipping thresholds are illustrative. BikeBuilder AI is not affiliated with these retailers.</p>
        </div>
      </Container>
    </div>
  );
}

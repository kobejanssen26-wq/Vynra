const eur0 = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export const formatEur = (n: number) => eur0.format(n);

/** "+€160" / "−€280" */
export const formatEurDelta = (n: number) => (n === 0 ? "±€0" : `${n > 0 ? "+" : "−"}${eur0.format(Math.abs(n))}`);

export const formatGrams = (g: number) => (g >= 1000 ? `${(g / 1000).toFixed(g >= 10000 ? 1 : 2)} kg` : `${Math.round(g).toLocaleString("en-IE")} g`);

export const formatKg = (kg: number) => `${kg.toFixed(1)} kg`;

/** "−125 g" (lighter) / "+80 g" (heavier) */
export const formatGramDelta = (g: number) => (g === 0 ? "±0 g" : `${g > 0 ? "+" : "−"}${Math.abs(Math.round(g)).toLocaleString("en-IE")} g`);

export const formatCount = (n: number) => n.toLocaleString("en-IE");

export const componentName = (c: { brand: string; model: string }) => `${c.brand} ${c.model}`;

export function timeAgo(iso: string, now = Date.now()) {
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" });
}

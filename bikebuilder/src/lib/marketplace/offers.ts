import { getComponent } from "../catalog";
import type { BikeComponent, Offer, Retailer } from "../types";

/**
 * Retailers and offers.
 *
 * No retailer price feeds or cart APIs are connected yet. `DemoOfferProvider`
 * generates deterministic *demo* prices around the catalog price so the UI can
 * be built and tested; `OfferProvider` is the seam for real integrations
 * (affiliate feeds, retailer APIs). Links open a product search on the
 * retailer's site — they are not deep links to a specific offer.
 */

const q = encodeURIComponent;
const siteSearch = (domain: string) => (query: string) => `https://www.google.com/search?q=${q(`site:${domain} ${query}`)}`;

export const RETAILERS: Retailer[] = [
  { id: "bike24", name: "Bike24", country: "DE", url: "https://www.bike24.com", searchUrl: (s) => `https://www.bike24.com/search-result?searchTerm=${q(s)}`, freeShippingFromEur: 150, cartIntegration: false },
  { id: "mantel", name: "Mantel", country: "NL", url: "https://www.mantel.com", searchUrl: siteSearch("mantel.com"), freeShippingFromEur: 100, cartIntegration: false },
  { id: "bike-discount", name: "Bike-Discount", country: "DE", url: "https://www.bike-discount.de", searchUrl: (s) => `https://www.bike-discount.de/en/search?sSearch=${q(s)}`, freeShippingFromEur: 150, cartIntegration: false },
  { id: "bike-components", name: "bike-components", country: "DE", url: "https://www.bike-components.de", searchUrl: (s) => `https://www.bike-components.de/en/s/?keywords=${q(s)}`, freeShippingFromEur: 150, cartIntegration: false },
  { id: "alltricks", name: "Alltricks", country: "FR", url: "https://www.alltricks.com", searchUrl: siteSearch("alltricks.com"), freeShippingFromEur: 100, cartIntegration: false },
];

export const getRetailer = (id: string) => RETAILERS.find((r) => r.id === id)!;

export interface OfferProvider {
  /** Whether prices are live. The UI labels non-live data as demo data. */
  live: boolean;
  offersFor(componentId: string): Promise<Offer[]>;
}

/** Small deterministic hash so demo prices are stable between renders. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967295;
}

const AVAILABILITY: Offer["availability"][] = ["in-stock", "in-stock", "in-stock", "low-stock", "backorder", "out-of-stock"];

export function demoOffers(component: BikeComponent, now = Date.now()): Offer[] {
  if (component.priceEur === 0) return [];
  return RETAILERS.filter((r) => hash(component.id + r.id + "carry") > 0.25).map((r) => {
    const h = hash(component.id + r.id);
    const price = Math.round(component.priceEur * (0.84 + h * 0.2));
    const shipsFree = r.freeShippingFromEur !== undefined && price >= r.freeShippingFromEur;
    return {
      componentId: component.id,
      retailerId: r.id,
      priceEur: price,
      availability: AVAILABILITY[Math.floor(hash(r.id + component.id) * AVAILABILITY.length)],
      shipping: shipsFree ? "Free shipping" : `€${(4.95 + Math.round(h * 5)).toFixed(2)} shipping`,
      updatedAt: new Date(now - Math.round(hash(component.id + "t" + r.id) * 36) * 3600_000).toISOString(),
      url: r.searchUrl(`${component.brand} ${component.model}`),
    };
  }).sort((a, b) => a.priceEur - b.priceEur);
}

export const DemoOfferProvider: OfferProvider = {
  live: false,
  offersFor: async (id) => {
    const c = getComponent(id);
    return c ? demoOffers(c) : [];
  },
};

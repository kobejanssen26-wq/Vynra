import Link from "next/link";
import { Logo } from "./Logo";

const COLS = [
  { title: "Product", links: [["Bike Builder", "/builder"], ["Compare Bikes", "/compare"], ["Marketplace", "/marketplace"], ["Pricing", "/pricing"]] },
  { title: "Community", links: [["Featured builds", "/community"], ["Mountain Beast", "/community/builds/mountain-beast"], ["Riders", "/community#riders"]] },
  { title: "Company", links: [["Log in", "/login"], ["Roadmap", "/pricing#roadmap"]] },
];

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-ink text-white">
      <div className="mx-auto grid max-w-[1320px] gap-12 px-4 py-16 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)] lg:px-10">
        <div>
          <Logo inverse />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/55">Build your dream bike before you buy it. Real components, compatibility checks and price comparison in one place.</p>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <p className="eyebrow text-white/40">{c.title}</p>
            <ul className="mt-4 space-y-2.5">
              {c.links.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-white/70 transition-colors hover:text-white">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-2 px-4 py-6 text-xs text-white/40 sm:flex-row sm:justify-between sm:px-6 lg:px-10">
          <p>© {new Date().getFullYear()} BikeBuilder AI. Prototype — catalog prices and weights are indicative sample data.</p>
          <p>Brand and product names belong to their respective owners. Not affiliated with any manufacturer or retailer.</p>
        </div>
      </div>
    </footer>
  );
}

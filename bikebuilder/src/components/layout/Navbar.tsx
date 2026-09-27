"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/builder", label: "Bike Builder" },
  { href: "/community", label: "Community" },
  { href: "/compare", label: "Compare Bikes" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/pricing", label: "Pricing" },
];

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  // Transparent over the home hero until the user scrolls.
  const overHero = pathname === "/" && !scrolled && !open;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-300",
        pathname === "/" && "-mb-[64px]",
        overHero ? "border-b border-transparent bg-transparent" : "border-b border-line bg-paper/90 backdrop-blur-md",
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-8 px-4 sm:px-6 lg:px-10">
        <Logo inverse={overHero} />
        <nav className="hidden flex-1 items-center gap-1 lg:flex" aria-label="Main">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "rounded-md px-3 py-2 text-[13.5px] font-medium transition-colors",
                overHero
                  ? active(n.href) ? "text-white" : "text-white/70 hover:text-white"
                  : active(n.href) ? "text-ink" : "text-muted hover:text-ink",
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <ButtonLink href="/login" variant={overHero ? "inverse-outline" : "ghost"} size="sm">
            Log in
          </ButtonLink>
          <ButtonLink href="/builder" variant={overHero ? "inverse" : "primary"} size="sm">
            Start Building
          </ButtonLink>
        </div>
        <button
          className={cn("ml-auto rounded-md p-2 lg:hidden", overHero ? "text-white" : "text-ink")}
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-line bg-paper lg:hidden"
            aria-label="Mobile"
          >
            <div className="flex flex-col px-4 py-3">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className={cn("rounded-md px-3 py-3 text-[15px] font-medium", active(n.href) ? "bg-paper-2 text-ink" : "text-muted")}>
                  {n.label}
                </Link>
              ))}
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-4">
                <ButtonLink href="/login" variant="outline">Log in</ButtonLink>
                <ButtonLink href="/builder">Start Building</ButtonLink>
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

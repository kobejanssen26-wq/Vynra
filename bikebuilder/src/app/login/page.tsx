import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PHOTOS } from "@/lib/images";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <div className="grid min-h-[calc(100dvh-64px)] lg:grid-cols-2">
      <div className="flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-3xl font-semibold tracking-[-0.025em]">Welcome back</h1>
          <p className="mt-2 text-[15px] text-muted">Log in to sync builds, follow riders and publish to the community.</p>
          <div className="mt-8"><LoginForm /></div>
          <p className="mt-6 text-center text-[13.5px] text-muted">
            No account needed to start — <Link href="/builder" className="font-medium text-ink underline underline-offset-2">open the builder</Link>.
          </p>
        </div>
      </div>
      <div className="relative hidden lg:block">
        <Image src={PHOTOS.bikepackingSunset} alt="Loaded mountain bike at sunset overlooking a valley" fill sizes="50vw" className="object-cover" />
      </div>
    </div>
  );
}

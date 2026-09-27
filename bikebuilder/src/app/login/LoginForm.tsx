"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const [submitted, setSubmitted] = useState(false);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
      }}
    >
      <label className="block">
        <span className="text-[13px] font-medium">Email</span>
        <input type="email" required autoComplete="email" className="mt-1.5 h-11 w-full rounded-md border border-line bg-white px-3 text-[14px] outline-none focus:border-ink/40" />
      </label>
      <label className="block">
        <span className="text-[13px] font-medium">Password</span>
        <input type="password" required autoComplete="current-password" className="mt-1.5 h-11 w-full rounded-md border border-line bg-white px-3 text-[14px] outline-none focus:border-ink/40" />
      </label>
      <Button type="submit" size="lg" className="w-full">Log in</Button>
      {submitted && (
        <p role="status" className="rounded-md bg-info-soft px-3 py-2.5 text-[13px] text-info">
          Accounts aren&apos;t available yet — nothing was sent. Your builds are saved in this browser in the meantime.
        </p>
      )}
    </form>
  );
}

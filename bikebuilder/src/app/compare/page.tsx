import type { Metadata } from "next";
import { Suspense } from "react";
import { CompareView } from "@/components/compare/CompareView";

export const metadata: Metadata = { title: "Compare Bikes" };

export default function Page() {
  return (
    <Suspense>
      <CompareView />
    </Suspense>
  );
}

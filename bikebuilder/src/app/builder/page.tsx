import type { Metadata } from "next";
import { BuilderPage } from "@/components/builder/BuilderPage";

export const metadata: Metadata = { title: "Bike Builder" };

export default function Page() {
  return <BuilderPage />;
}

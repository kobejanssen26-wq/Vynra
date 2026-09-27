import { BrandStrip } from "@/components/home/BrandStrip";
import { CommunityHighlight } from "@/components/home/CommunityHighlight";
import { Features } from "@/components/home/Features";
import { FinalCta } from "@/components/home/FinalCta";
import { Hero } from "@/components/home/Hero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Showcase } from "@/components/home/Showcase";
import { ToolsTeaser } from "@/components/home/ToolsTeaser";

export default function HomePage() {
  return (
    <>
      <Hero />
      <BrandStrip />
      <Features />
      <HowItWorks />
      <Showcase />
      <CommunityHighlight />
      <ToolsTeaser />
      <FinalCta />
    </>
  );
}

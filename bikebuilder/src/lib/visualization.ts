import type { Discipline, PartSelection } from "./types";

/**
 * Seam for AI image generation.
 *
 * Today the builder renders a schematic SVG (components/bike/BikeVisual) that
 * updates instantly from component data. A photoreal renderer would implement
 * this interface — e.g. by sending a structured prompt built from the selected
 * components to an image-generation API and caching the result per selection.
 */
export interface VisualizationProvider {
  id: string;
  render(input: { discipline: Discipline; selection: PartSelection; view: "side" | "three-quarter" }): Promise<{ imageUrl: string }>;
}

/** Builds the prompt a future image model would receive. Pure and testable. */
export function describeForImageModel(discipline: Discipline, parts: Record<string, { brand: string; model: string } | undefined>): string {
  const list = Object.entries(parts)
    .filter(([, c]) => c)
    .map(([cat, c]) => `${cat}: ${c!.brand} ${c!.model}`)
    .join("; ");
  return `Studio side-view product photo of a ${discipline === "mtb" ? "mountain bike" : "road bike"} built with: ${list}. Neutral light-grey background, soft shadow.`;
}

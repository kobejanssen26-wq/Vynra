import type { BikeComponent, CategoryId, Discipline } from "../types";
import { MTB_COMPONENTS } from "./mtb";
import { ROAD_COMPONENTS } from "./road";

/**
 * In-memory catalog. `ComponentRepository` (lib/services/repositories.ts) is
 * the seam where a real database or supplier feed replaces this.
 */
export const ALL_COMPONENTS: BikeComponent[] = [...MTB_COMPONENTS, ...ROAD_COMPONENTS];

const BY_ID = new Map(ALL_COMPONENTS.map((c) => [c.id, c]));

export function getComponent(id: string | undefined): BikeComponent | undefined {
  return id ? BY_ID.get(id) : undefined;
}

export function listComponents(discipline: Discipline, category?: CategoryId): BikeComponent[] {
  return ALL_COMPONENTS.filter(
    (c) => c.disciplines.includes(discipline) && (!category || c.category === category),
  );
}

export const BRANDS = Array.from(new Set(ALL_COMPONENTS.map((c) => c.brand))).sort();

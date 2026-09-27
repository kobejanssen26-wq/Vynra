import type { CategoryId, Discipline } from "./types";

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  description: string;
  /** Relative influence on the heuristic performance/comfort/durability scores. */
  weight: number;
  /** Whether a build is considered incomplete without it. */
  required: boolean;
}

export const CATEGORIES: CategoryMeta[] = [
  { id: "frame", label: "Frame", description: "Geometry, suspension platform and standards", weight: 0.2, required: true },
  { id: "fork", label: "Fork", description: "Front suspension or frameset fork", weight: 0.12, required: true },
  { id: "wheels", label: "Wheels", description: "Wheelset incl. hubs", weight: 0.14, required: true },
  { id: "tires", label: "Tires", description: "Front and rear tire", weight: 0.1, required: true },
  { id: "groupset", label: "Groupset", description: "Shifter(s) and derailleur", weight: 0.08, required: true },
  { id: "crankset", label: "Crankset", description: "Cranks and chainring(s)", weight: 0.05, required: true },
  { id: "cassette", label: "Cassette", description: "Rear sprockets", weight: 0.04, required: true },
  { id: "chain", label: "Chain", description: "12-speed chain", weight: 0.02, required: true },
  { id: "brakes", label: "Brakes", description: "Calipers, levers and rotors", weight: 0.08, required: true },
  { id: "handlebar", label: "Handlebar", description: "Bar width, rise and material", weight: 0.03, required: true },
  { id: "stem", label: "Stem", description: "Reach and bar clamp", weight: 0.02, required: true },
  { id: "seatpost", label: "Seatpost", description: "Dropper or rigid post", weight: 0.04, required: true },
  { id: "saddle", label: "Saddle", description: "Contact point", weight: 0.04, required: true },
  { id: "pedals", label: "Pedals", description: "Clipless or flat", weight: 0.04, required: false },
];

export const CATEGORY_ORDER = CATEGORIES.map((c) => c.id);

export const categoryMeta = (id: CategoryId) => CATEGORIES.find((c) => c.id === id)!;

export const DISCIPLINE_LABEL: Record<Discipline, string> = {
  mtb: "Mountain bike",
  road: "Road bike",
};

/** Extra weight for parts the builder doesn't list (headset, BB, cables, sealant, bolts). */
export const HARDWARE_ALLOWANCE_G: Record<Discipline, number> = {
  mtb: 450,
  road: 300,
};

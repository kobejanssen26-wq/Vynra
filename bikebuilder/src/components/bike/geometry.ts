import type { BikeComponent, CategoryId, Discipline } from "@/lib/types";

/**
 * Simplified side-view geometry for the schematic renderer.
 * Values are typical for each frame category — the drawing is illustrative,
 * not a geometry chart.
 */

export type Pt = { x: number; y: number };
type Parts = Partial<Record<CategoryId, BikeComponent>>;

export const S = 0.55; // px per mm

const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y });
const mul = (a: Pt, k: number): Pt => ({ x: a.x * k, y: a.y * k });
export const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
// Rounded so server and browser trig results can't cause hydration mismatches.
export const r4 = (n: number) => Math.round(n * 1e4) / 1e4;
const dir = (deg: number): Pt => ({ x: r4(-Math.cos((deg * Math.PI) / 180)), y: r4(-Math.sin((deg * Math.PI) / 180)) });

export type Shape = "xc" | "trail" | "enduro" | "hardtail" | "road-race" | "road-light";

export function geometry(discipline: Discipline, parts: Parts) {
  const road = discipline === "road";
  const shape: Shape = (parts.frame?.visual?.shape as Shape) ?? (road ? "road-race" : "trail");
  const tireMm = parts.tires?.compat.tireWidthMm ?? (road ? 28 : 60);
  const rimR = 311 * S;
  const tireH = tireMm * 0.85 * S;
  const R = rimR + tireH;

  const travel = parts.fork?.compat.travelMm ?? (road ? 0 : 140);
  const [lo, hi] = parts.frame?.compat.forkTravelRange ?? [travel, travel];
  const designTravel = Math.min(hi, Math.max(lo, travel));
  // ±0.5° head angle per 10 mm of travel away from the frame's design range.
  const baseHA = road ? 73 : shape === "xc" || shape === "hardtail" ? 68 : shape === "enduro" ? 63.5 : 65;
  const headAngle = baseHA - ((travel - designTravel) / 10) * 0.5;

  const wheelbase = road ? 990 : shape === "xc" || shape === "hardtail" ? 1150 : shape === "enduro" ? 1280 : 1225;
  const chainstay = road ? 410 : shape === "enduro" ? 445 : 435;
  const bbDrop = road ? 70 : 32;
  const seatAngle = road ? 73.5 : 76.5;
  const seatTube = road ? 520 : 430;
  const headTube = road ? 150 : 110;
  const a2c = road ? 370 : 425 + travel;
  const saddleHeight = road ? 730 : 745;

  const ground = 600;
  const rear: Pt = { x: 40 + R, y: ground - R };
  const front: Pt = { x: rear.x + wheelbase * S, y: rear.y };
  const bb: Pt = { x: r4(rear.x + Math.sqrt(chainstay ** 2 - bbDrop ** 2) * S), y: rear.y + bbDrop * S };

  const u = dir(headAngle); // up the steering axis
  const crown = add(add(front, mul(u, a2c * S)), { x: -12, y: 0 });
  const htBottom = add(crown, mul(u, 14));
  const htTop = add(htBottom, mul(u, headTube * S));
  const spacerTop = add(htTop, mul(u, 12));

  const st = dir(seatAngle);
  const stTop = add(bb, mul(st, seatTube * S));
  const saddle = add(bb, mul(st, saddleHeight * S));

  const stemLen = (road ? 110 : parseInt(parts.stem?.specs.find((s) => s.label === "Length")?.value ?? "45", 10) || 45) * S;
  const stemAngle = road ? -8 : 4;
  const stemEnd = add(spacerTop, { x: r4(Math.cos((stemAngle * Math.PI) / 180) * stemLen), y: r4(-Math.sin((stemAngle * Math.PI) / 180) * stemLen) });

  // Top tube meets the seat tube lower on sloping MTB frames.
  const ttSeat = lerp(bb, stTop, road ? 0.93 : 0.8);
  const ttHead = lerp(htTop, htBottom, 0.18);
  const dtHead = lerp(htBottom, htTop, 0.1);
  const ssSeat = lerp(bb, stTop, road ? 0.88 : 0.82);

  const rotorF = (parts.brakes?.compat.rotorsMm?.[0] ?? (road ? 160 : 180)) * S * 0.5;
  const rotorR = (parts.brakes?.compat.rotorsMm?.[1] ?? (road ? 140 : 180)) * S * 0.5;

  const ringR = (road ? 105 : 65) * S;
  const cogR = (road ? 61 : 105) * S;
  const crankLen = 170 * S;

  return {
    road, shape, R, rimR, tireH, tireMm, travel, headAngle, u, st,
    rear, front, bb, crown, htBottom, htTop, spacerTop, stTop, saddle, stemEnd,
    ttSeat, ttHead, dtHead, ssSeat, rotorF, rotorR, ringR, cogR, crankLen, ground,
    width: front.x + R + 40,
  };
}

export type Geo = ReturnType<typeof geometry>;
export { add, mul };

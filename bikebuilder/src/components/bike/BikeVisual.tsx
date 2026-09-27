"use client";

import { useId, useMemo } from "react";
import { resolveParts } from "@/lib/compatibility/engine";
import type { CategoryId, Discipline, PartSelection, Severity } from "@/lib/types";
import { cn } from "@/lib/utils";
import { add, geometry, lerp, mul, r4, type Geo, type Pt } from "./geometry";

interface Props {
  discipline: Discipline;
  selection: PartSelection;
  className?: string;
  /** Interactive labels on each component. */
  hotspots?: boolean;
  onSelect?: (category: CategoryId) => void;
  highlight?: CategoryId | null;
  status?: Partial<Record<CategoryId, Severity>>;
  /** Dark background variant. */
  tone?: "light" | "dark";
}

const STANCHION: Record<string, string> = {
  kashima: "#c9a24a",
  gold: "#d8b24c",
  black: "#1d1f21",
  silver: "#c8cccf",
};

/**
 * Schematic, data-driven bike renderer. Proportions respond to real component
 * attributes (fork travel, tire width, rotor size, rim depth, frame type, bar
 * type, dropper vs rigid post, pedal type). The `VisualizationProvider` seam in
 * lib/visualization.ts is where a photoreal image-generation service would plug in.
 */
export function BikeVisual({ discipline, selection, className, hotspots, onSelect, highlight, status, tone = "light" }: Props) {
  const parts = useMemo(() => resolveParts(selection), [selection]);
  const g = useMemo(() => geometry(discipline, parts), [discipline, parts]);
  const uid = useId().replace(/:/g, "");
  const dark = tone === "dark";

  const frameColor = parts.frame?.visual?.color ?? (dark ? "#3a3d40" : "#c9ccce");
  const accent = parts.frame?.visual?.accent ?? "#8a9199";
  const hasFrame = !!parts.frame;
  const stanchion = STANCHION[parts.fork?.visual?.stanchion ?? "black"];
  const tire = dark ? "#0b0b0b" : "#141516";
  const rim = dark ? "#2b2e31" : "#2a2d30";
  const metal = dark ? "#8d9296" : "#9aa0a5";
  const rimDepth = Math.max(9, (parts.wheels?.visual?.rimDepthMm ?? (g.road ? 30 : 22)) * 0.55);
  const fullSus = g.shape === "xc" || g.shape === "trail" || g.shape === "enduro";
  const dropper = !!parts.seatpost && /dropper|transfer|reverb/i.test(parts.seatpost.model);
  const flatPedal = parts.pedals?.compat.pedalType === "flat";
  const tube = g.road ? { dt: 17, tt: 12, st: 13, stay: 7 } : { dt: 22, tt: 16, st: 16, stay: 10 };
  const dim = (c: CategoryId) => (highlight && highlight !== c ? 0.35 : 1);

  const vbH = 640;
  const path = (pts: Pt[]) => pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${g.width.toFixed(0)} ${vbH}`}
      className={cn("h-auto w-full select-none", className)}
      role="img"
      aria-label={`Schematic ${discipline === "mtb" ? "mountain" : "road"} bike${parts.frame ? ` based on the ${parts.frame.brand} ${parts.frame.model}` : ""}`}
    >
      <defs>
        <radialGradient id={`shadow-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000" stopOpacity={dark ? 0.55 : 0.18} />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`frame-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <ellipse cx={(g.rear.x + g.front.x) / 2} cy={g.ground + 6} rx={(g.front.x - g.rear.x) / 2 + g.R * 0.9} ry={16} fill={`url(#shadow-${uid})`} />

      {/* Wheels */}
      {[g.rear, g.front].map((c, i) => (
        <g key={i} opacity={dim(i ? "tires" : "wheels")}>
          <circle cx={c.x} cy={c.y} r={g.rimR + g.tireH / 2} fill="none" stroke={tire} strokeWidth={g.tireH} />
          {!g.road && (
            <circle cx={c.x} cy={c.y} r={g.R - 1.5} fill="none" stroke={tire} strokeWidth={4} strokeDasharray="4 5" />
          )}
          <circle cx={c.x} cy={c.y} r={g.rimR - rimDepth / 2} fill="none" stroke={rim} strokeWidth={rimDepth} />
          <circle cx={c.x} cy={c.y} r={g.rimR - rimDepth} fill="none" stroke="#fff" strokeOpacity={0.1} strokeWidth={1} />
          <circle cx={c.x} cy={c.y} r={g.rimR - 1} fill="none" stroke="#fff" strokeOpacity={0.12} strokeWidth={1.5} />
          {Array.from({ length: g.road && rimDepth > 25 ? 20 : 28 }).map((_, k, arr) => {
            const a = (k / arr.length) * Math.PI * 2;
            const r0 = 10;
            const r1 = g.rimR - rimDepth;
            return (
              <line key={k} x1={r4(c.x + Math.cos(a + 0.3) * r0)} y1={r4(c.y + Math.sin(a + 0.3) * r0)} x2={r4(c.x + Math.cos(a) * r1)} y2={r4(c.y + Math.sin(a) * r1)} stroke={metal} strokeWidth={0.9} strokeOpacity={0.8} />
            );
          })}
          <circle cx={c.x} cy={c.y} r={i ? g.rotorF : g.rotorR} fill="none" stroke="#b9bdc1" strokeWidth={5} strokeDasharray="6 3" opacity={dim("brakes")} />
          <circle cx={c.x} cy={c.y} r={11} fill="#232526" stroke="#3a3d40" strokeWidth={2} />
        </g>
      ))}

      {/* Drivetrain */}
      <g opacity={dim("chain")}>
        <path
          d={path([{ x: g.rear.x, y: g.rear.y - g.cogR * 0.55 }, { x: g.bb.x, y: g.bb.y - g.ringR }])}
          stroke="#4a4d50"
          strokeWidth={3.5}
          strokeDasharray="3 1.5"
        />
        <path
          d={path([{ x: g.bb.x, y: g.bb.y + g.ringR }, { x: g.rear.x + 6, y: g.rear.y + 52 }, { x: g.rear.x, y: g.rear.y + g.cogR * 0.3 }])}
          fill="none"
          stroke="#4a4d50"
          strokeWidth={3.5}
          strokeDasharray="3 1.5"
        />
      </g>
      <g opacity={dim("cassette")}>
        {[1, 0.82, 0.64, 0.46, 0.3].map((k) => (
          <circle key={k} cx={g.rear.x} cy={g.rear.y} r={g.cogR * k * 0.55 + 4} fill="none" stroke="#6f7478" strokeWidth={2} />
        ))}
      </g>
      <g opacity={dim("groupset")}>
        <path
          d={`M${g.rear.x + 4} ${g.rear.y + 6} L${g.rear.x + 14} ${g.rear.y + 28} L${g.rear.x + 2} ${g.rear.y + 56} L${g.rear.x + 16} ${g.rear.y + 60}`}
          fill="none"
          stroke="#2a2c2e"
          strokeWidth={6}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle cx={g.rear.x + 12} cy={g.rear.y + 30} r={5} fill="#3a3d40" />
        <circle cx={g.rear.x + 6} cy={g.rear.y + 54} r={5} fill="#3a3d40" />
      </g>

      {/* Frame */}
      <g opacity={hasFrame ? dim("frame") : 0.5} strokeLinecap="round" strokeLinejoin="round">
        {/* chainstay + seatstay */}
        <path d={path([g.bb, g.rear])} stroke={frameColor} strokeWidth={tube.stay + 2} fill="none" />
        {fullSus ? <FullSusRear g={g} color={frameColor} stay={tube.stay} /> : <path d={path([g.rear, g.ssSeat])} stroke={frameColor} strokeWidth={tube.stay} fill="none" />}
        {/* main triangle */}
        <path d={path([g.bb, g.dtHead])} stroke={frameColor} strokeWidth={tube.dt} fill="none" />
        <path d={path([g.ttSeat, g.ttHead])} stroke={frameColor} strokeWidth={tube.tt} fill="none" />
        <path d={path([g.bb, g.stTop])} stroke={frameColor} strokeWidth={tube.st} fill="none" />
        <path d={path([g.htBottom, g.htTop])} stroke={frameColor} strokeWidth={tube.dt + 4} fill="none" />
        {/* gloss */}
        <path d={path([g.bb, g.dtHead])} stroke={`url(#frame-${uid})`} strokeWidth={tube.dt} fill="none" />
        <path d={path([lerp(g.bb, g.dtHead, 0.22), lerp(g.bb, g.dtHead, 0.52)])} stroke={accent} strokeWidth={3} strokeOpacity={0.8} fill="none" />
        {parts.frame && (
          <text
            x={lerp(g.bb, g.dtHead, 0.58).x}
            y={lerp(g.bb, g.dtHead, 0.58).y}
            transform={`rotate(${r4((Math.atan2(g.dtHead.y - g.bb.y, g.dtHead.x - g.bb.x) * 180) / Math.PI)} ${lerp(g.bb, g.dtHead, 0.58).x} ${lerp(g.bb, g.dtHead, 0.58).y})`}
            fill={accent}
            fontSize={g.road ? 10 : 12}
            fontWeight={700}
            letterSpacing="0.2em"
            dominantBaseline="middle"
            style={{ fontFamily: "var(--font-inter-tight)", textTransform: "uppercase" }}
          >
            {parts.frame.brand}
          </text>
        )}
        <circle cx={g.bb.x} cy={g.bb.y} r={tube.dt * 0.7} fill={frameColor} />
      </g>

      {/* Fork */}
      <g opacity={dim("fork")} strokeLinecap="round">
        {g.road ? (
          <path d={`M${g.front.x} ${g.front.y} Q ${g.front.x + 6} ${(g.front.y + g.crown.y) / 2} ${g.crown.x} ${g.crown.y}`} stroke={frameColor} strokeWidth={11} fill="none" />
        ) : (
          <>
            <path d={path([g.front, lerp(g.front, g.crown, 0.55)])} stroke="#1c1e20" strokeWidth={17} />
            <path d={path([lerp(g.front, g.crown, 0.5), g.crown])} stroke={stanchion} strokeWidth={11} />
            <path d={path([add(g.crown, mul(g.u, -2)), add(g.crown, { x: 0, y: 0 })])} stroke="#1c1e20" strokeWidth={22} />
          </>
        )}
      </g>

      {/* Cockpit */}
      <g opacity={dim("stem")} strokeLinecap="round">
        <path d={path([g.htTop, g.spacerTop])} stroke="#232526" strokeWidth={tube.dt + 2} />
        <path d={path([g.spacerTop, g.stemEnd])} stroke="#232526" strokeWidth={10} />
      </g>
      <g opacity={dim("handlebar")} strokeLinecap="round" fill="none">
        {g.road ? (
          <path
            d={`M${g.stemEnd.x} ${g.stemEnd.y} q 30 -2 42 10 q 8 16 -6 40 q -8 14 -26 14`}
            stroke="#1b1c1d"
            strokeWidth={8}
          />
        ) : (
          <>
            <path d={`M${g.stemEnd.x} ${g.stemEnd.y} q -4 -14 -14 -22`} stroke="#1b1c1d" strokeWidth={9} />
            <path d={`M${g.stemEnd.x - 14} ${g.stemEnd.y - 22} l -22 -6`} stroke="#303335" strokeWidth={13} />
            <circle cx={g.stemEnd.x} cy={g.stemEnd.y} r={7} fill="#1b1c1d" />
          </>
        )}
      </g>

      {/* Seatpost + saddle */}
      <g opacity={dim("seatpost")} strokeLinecap="round">
        <path d={path([g.stTop, g.saddle])} stroke={dropper ? "#1f2123" : "#2b2d2f"} strokeWidth={g.road ? 9 : 11} />
        {dropper && <path d={path([lerp(g.stTop, g.saddle, 0.05), lerp(g.stTop, g.saddle, 0.14)])} stroke="#0f1011" strokeWidth={15} />}
      </g>
      <g opacity={dim("saddle")}>
        <path
          d={`M${g.saddle.x - 44} ${g.saddle.y - 6} q 36 -16 78 -5 q 12 4 20 9 q -44 10 -98 -4 z`}
          fill="#151617"
        />
      </g>

      {/* Cranks + pedals */}
      <g opacity={dim("crankset")}>
        <circle cx={g.bb.x} cy={g.bb.y} r={g.ringR} fill="none" stroke="#2c2f31" strokeWidth={5} />
        <circle cx={g.bb.x} cy={g.bb.y} r={g.ringR - 7} fill="none" stroke="#2c2f31" strokeWidth={1.5} strokeDasharray="2 3" />
        <path d={path([g.bb, { x: g.bb.x + g.crankLen * 0.72, y: g.bb.y + g.crankLen * 0.7 }])} stroke="#1a1b1c" strokeWidth={11} strokeLinecap="round" />
        <circle cx={g.bb.x} cy={g.bb.y} r={9} fill="#3a3d40" />
      </g>
      <g opacity={dim("pedals")}>
        <rect
          x={g.bb.x + g.crankLen * 0.72 - (flatPedal ? 22 : 15)}
          y={g.bb.y + g.crankLen * 0.7 - 5}
          width={flatPedal ? 44 : 30}
          height={flatPedal ? 10 : 8}
          rx={2}
          fill="#202223"
        />
      </g>

      {/* Calipers */}
      <g opacity={dim("brakes")}>
        <rect x={g.front.x - g.rotorF * 0.75 - 7} y={g.front.y - g.rotorF * 0.72 - 7} width={20} height={14} rx={3} fill="#2a2c2e" transform={`rotate(-40 ${g.front.x - g.rotorF * 0.75} ${g.front.y - g.rotorF * 0.72})`} />
        <rect x={g.rear.x + g.rotorR * 0.2 - 8} y={g.rear.y + g.rotorR * 0.95 - 6} width={20} height={13} rx={3} fill="#2a2c2e" />
      </g>

      {hotspots && <Hotspots g={g} onSelect={onSelect} highlight={highlight} status={status} dark={dark} />}
    </svg>
  );
}

function FullSusRear({ g, color, stay }: { g: Geo; color: string; stay: number }) {
  const pivot = lerp(g.bb, g.stTop, g.shape === "xc" ? 0.72 : 0.64);
  const rockerEnd = lerp(pivot, g.ttHead, 0.2);
  const shockEnd = lerp(g.bb, g.dtHead, g.shape === "xc" ? 0.42 : 0.38);
  const shockMid = lerp(rockerEnd, shockEnd, 0.5);
  return (
    <>
      <path d={`M${g.rear.x} ${g.rear.y} L${pivot.x} ${pivot.y}`} stroke={color} strokeWidth={stay + 1} fill="none" strokeLinecap="round" />
      <path d={`M${pivot.x} ${pivot.y} L${rockerEnd.x} ${rockerEnd.y}`} stroke={color} strokeWidth={stay + 5} fill="none" strokeLinecap="round" />
      <path d={`M${rockerEnd.x} ${rockerEnd.y} L${shockMid.x} ${shockMid.y}`} stroke="#c9a24a" strokeWidth={9} strokeLinecap="round" />
      <path d={`M${shockMid.x} ${shockMid.y} L${shockEnd.x} ${shockEnd.y}`} stroke="#1c1e20" strokeWidth={15} strokeLinecap="round" />
      <circle cx={pivot.x} cy={pivot.y} r={4} fill="#111" />
      <circle cx={rockerEnd.x} cy={rockerEnd.y} r={4} fill="#111" />
    </>
  );
}

const HOTSPOT_LABEL: Partial<Record<CategoryId, string>> = {
  frame: "Frame",
  fork: "Fork",
  wheels: "Wheels",
  tires: "Tires",
  groupset: "Groupset",
  crankset: "Crankset",
  cassette: "Cassette",
  brakes: "Brakes",
  handlebar: "Handlebar",
  stem: "Stem",
  seatpost: "Seatpost",
  saddle: "Saddle",
  pedals: "Pedals",
};

function Hotspots({
  g,
  onSelect,
  highlight,
  status,
  dark,
}: {
  g: Geo;
  onSelect?: (c: CategoryId) => void;
  highlight?: CategoryId | null;
  status?: Partial<Record<CategoryId, Severity>>;
  dark: boolean;
}) {
  const spots: Partial<Record<CategoryId, Pt>> = {
    frame: lerp(g.ttSeat, g.ttHead, 0.45),
    fork: lerp(g.front, g.crown, 0.6),
    wheels: { x: g.rear.x - g.rimR * 0.7, y: g.rear.y - g.rimR * 0.7 },
    tires: { x: g.front.x + g.R * 0.72, y: g.front.y - g.R * 0.7 },
    groupset: { x: g.rear.x + 12, y: g.rear.y + 60 },
    crankset: { x: g.bb.x - g.ringR * 0.7, y: g.bb.y + g.ringR * 0.7 },
    cassette: { x: g.rear.x, y: g.rear.y },
    brakes: { x: g.front.x - g.rotorF * 0.75, y: g.front.y - g.rotorF * 0.72 },
    handlebar: { x: g.stemEnd.x + (g.road ? 40 : -20), y: g.stemEnd.y + (g.road ? 20 : -18) },
    stem: lerp(g.spacerTop, g.stemEnd, 0.5),
    seatpost: lerp(g.stTop, g.saddle, 0.5),
    saddle: { x: g.saddle.x, y: g.saddle.y - 8 },
    pedals: { x: g.bb.x + g.crankLen * 0.72, y: g.bb.y + g.crankLen * 0.7 },
  };
  const color = (s?: Severity) => (s === "error" ? "#c2412d" : s === "warning" ? "#b7791f" : "#1f8a4c");
  return (
    <g>
      {(Object.entries(spots) as [CategoryId, Pt][]).map(([cat, p]) => {
        const active = highlight === cat;
        return (
          <g
            key={cat}
            className="cursor-pointer outline-none"
            onClick={() => onSelect?.(cat)}
            role="button"
            tabIndex={0}
            aria-label={`Open ${HOTSPOT_LABEL[cat]}`}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect?.(cat)}
          >
            <circle cx={p.x} cy={p.y} r={active ? 15 : 12} fill={color(status?.[cat])} fillOpacity={0.18} />
            <circle cx={p.x} cy={p.y} r={5.5} fill={color(status?.[cat])} stroke={dark ? "#0e0f0f" : "#fff"} strokeWidth={2} />
            {active && (
              <g>
                <rect x={p.x + 14} y={p.y - 13} width={HOTSPOT_LABEL[cat]!.length * 7.6 + 18} height={26} rx={4} fill={dark ? "#fafaf7" : "#0e0f0f"} />
                <text x={p.x + 23} y={p.y + 1} fontSize={12.5} fontWeight={600} fill={dark ? "#0e0f0f" : "#fafaf7"} dominantBaseline="middle">
                  {HOTSPOT_LABEL[cat]}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
}

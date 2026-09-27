/**
 * Core domain model for BikeBuilder AI.
 *
 * Everything the UI renders is derived from these types, so a real component
 * database, retailer feeds or an LLM provider can be plugged in later without
 * touching the presentation layer.
 */

export type Discipline = "mtb" | "road";

export type CategoryId =
  | "frame"
  | "fork"
  | "wheels"
  | "tires"
  | "groupset"
  | "crankset"
  | "cassette"
  | "chain"
  | "brakes"
  | "handlebar"
  | "stem"
  | "seatpost"
  | "saddle"
  | "pedals";

export type WheelSize = "29" | "27.5" | "700c";
export type Freehub = "XD" | "XDR" | "MicroSpline" | "HG";
export type BrakeMount = "post-mount" | "flat-mount";

/** Drivetrain "ecosystems" that determine which parts work together. */
export type DrivetrainFamily =
  | "sram-transmission" // SRAM Eagle Transmission (T-Type), requires a UDH frame
  | "sram-eagle" // SRAM Eagle 12s (non T-Type)
  | "shimano-mtb-12" // Shimano XTR / XT / SLX 12s
  | "shimano-road-12" // Shimano Dura-Ace / Ultegra 12s
  | "sram-road-axs"; // SRAM Red / Force AXS 12s

export type ChainStandard = "flattop" | "t-type" | "sram-eagle" | "shimano-hg";

export type Maintenance = "low" | "medium" | "high";

/** 0–10 subjective ratings. Used by the heuristic scoring model in lib/stats. */
export interface Ratings {
  performance: number;
  comfort: number;
  durability: number;
  climbing: number;
  descending: number;
}

/**
 * Machine-readable attributes used by the compatibility engine.
 * Every field is optional: a rule only runs when both sides provide data.
 */
export interface CompatAttributes {
  wheelSize?: WheelSize;
  /** Frame: fork travel range the frame is designed around (mm). */
  forkTravelRange?: [number, number];
  /** Fork: travel (mm). Frame: rear travel (mm, 0 for hardtail/road). */
  travelMm?: number;
  /** Frame / fork: max tire width (mm). Tires: nominal width (mm). */
  maxTireMm?: number;
  tireWidthMm?: number;
  /** Frame: supports SRAM Universal Derailleur Hanger / Full Mount. */
  udh?: boolean;
  /** Groupset: needs a UDH frame. */
  requiresUdh?: boolean;
  /** Wheels: freehub bodies the wheelset is sold with. */
  freehubOptions?: Freehub[];
  /** Cassette: freehub body it needs. */
  freehub?: Freehub;
  drivetrain?: DrivetrainFamily;
  speeds?: number;
  chain?: ChainStandard;
  /** Frame (rear) and fork (front) brake mount. */
  brakeMount?: BrakeMount;
  /** Brakes: caliper mount versions the brake is sold in. */
  brakeMounts?: BrakeMount[];
  /** Fork: smallest rotor the fork mount accepts natively (mm). */
  minRotorMm?: number;
  /** Brakes: rotor sizes shipped [front, rear] (mm). */
  rotorsMm?: [number, number];
  /** Brakes: which system the lever belongs to. Road hydraulic levers are integrated in the groupset shifters. */
  brakeSystem?: "shimano" | "sram" | "magura" | "hope";
  /** Handlebar clamp / stem clamp diameter (mm). */
  barClampMm?: 31.8 | 35;
  /** Frame: seatpost fit (a diameter like "34.9" or a proprietary key like "tarmac-sl8"). */
  seatpostFit?: string;
  /** Seatpost: fits these frame keys / diameters. */
  seatpostFits?: string[];
  /** Pedals: interface type — for display only, no rule. */
  pedalType?: "clipless-spd" | "clipless-road" | "flat";
  /** Electronic shifting — used for the maintenance heuristic. */
  electronic?: boolean;
  /** Component only fits these specific frames (e.g. frameset-specific forks). */
  onlyFitsFrames?: string[];
}

/** Hints used by the schematic bike renderer. Not used for any calculation. */
export interface VisualHints {
  color?: string;
  accent?: string;
  /** Rim depth in mm (wheels). */
  rimDepthMm?: number;
  /** Stanchion finish (forks). */
  stanchion?: "kashima" | "black" | "silver" | "gold";
  /** Frame silhouette. */
  shape?: "xc" | "trail" | "enduro" | "hardtail" | "road-race" | "road-light";
}

export interface SpecLine {
  label: string;
  value: string;
}

export interface BikeComponent {
  id: string;
  category: CategoryId;
  disciplines: Discipline[];
  brand: string;
  model: string;
  /** Indicative retail price in EUR. Sample data — see README. */
  priceEur: number;
  /** Weight in grams, as sold (pairs for tires, brakes, pedals; set for wheels). */
  weightG: number;
  /** 1 (entry) … 5 (flagship) */
  tier: 1 | 2 | 3 | 4 | 5;
  ratings: Ratings;
  maintenance: Maintenance;
  compat: CompatAttributes;
  specs: SpecLine[];
  summary: string;
  pros: string[];
  cons: string[];
  visual?: VisualHints;
  /** Short note shown when the component is bundled (e.g. frameset fork). */
  includedWith?: string;
}

/** A user's selection: one component per category. */
export type PartSelection = Partial<Record<CategoryId, string>>;

export interface Build {
  id: string;
  name: string;
  discipline: Discipline;
  parts: PartSelection;
  authorId?: string;
  createdAt: string;
  updatedAt: string;
  visibility: "private" | "public";
  description?: string;
  /** Cover photo for community builds. */
  coverImage?: string;
  /** If this build was copied, the id of the source build. */
  copiedFrom?: string;
}

export type Severity = "ok" | "info" | "warning" | "error";

export interface CompatibilityIssue {
  ruleId: string;
  severity: Exclude<Severity, "ok">;
  categories: CategoryId[];
  message: string;
  /** How to fix it, in plain language. */
  fix?: string;
}

export interface BuildStats {
  priceEur: number;
  weightKg: number;
  /** Estimated weight of parts not in the builder (headset, BB, cables, sealant…). */
  hardwareAllowanceG: number;
  performance: number; // 0-100
  comfort: number; // 0-100
  durability: number; // 0-100
  climbing: number; // 0-10
  descending: number; // 0-10
  maintenance: "Easy" | "Moderate" | "Demanding";
  terrain: "Road" | "XC" | "Trail" | "All-Mountain" | "Enduro";
  frontTravelMm: number;
  rearTravelMm: number;
  wheelSize?: WheelSize;
  drivetrain?: string;
  brakes?: string;
  missing: CategoryId[];
}

/** A proposed change to a build, always with a reason grounded in data. */
export interface Swap {
  category: CategoryId;
  fromId?: string;
  toId: string;
  reason: string;
  deltaPriceEur: number;
  deltaWeightG: number;
}

export interface User {
  id: string;
  username: string;
  name: string;
  avatar: string;
  location: string;
  ridingStyle: string;
  bio: string;
  followers: number;
  following: number;
  likes: number;
  joined: string;
}

export interface Comment {
  id: string;
  buildId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface CommunityBuild extends Build {
  authorId: string;
  likes: number;
  comments: number;
  saves: number;
  tags: string[];
}

export type NotificationKind = "like" | "comment" | "follow" | "copy" | "price-drop";

export interface Notification {
  id: string;
  kind: NotificationKind;
  actorId?: string;
  buildId?: string;
  componentId?: string;
  createdAt: string;
  read: boolean;
}

export interface Retailer {
  id: string;
  name: string;
  country: string;
  url: string;
  /** Builds a product search URL on the retailer site. */
  searchUrl: (query: string) => string;
  freeShippingFromEur?: number;
  cartIntegration: false; // no retailer cart APIs are integrated yet
}

export interface Offer {
  componentId: string;
  retailerId: string;
  priceEur: number;
  availability: "in-stock" | "low-stock" | "backorder" | "out-of-stock";
  shipping: string;
  updatedAt: string;
  url: string;
}

import type { Discipline, PartSelection } from "./types";

/** Starting points for a new build. */
export const PRESETS: Record<Discipline, { name: string; parts: PartSelection }> = {
  mtb: {
    name: "My Trail Build",
    parts: {
      frame: "canyon-spectral-cf",
      fork: "fox-36-factory",
      wheels: "dt-xm-1700",
      tires: "maxxis-rekon-race-24",
      groupset: "shimano-xt-m8100",
      crankset: "shimano-xt-crank",
      cassette: "shimano-xt-cassette",
      chain: "shimano-xt-chain",
      brakes: "shimano-xt-m8120",
      handlebar: "raceface-atlas-35",
      stem: "raceface-turbine-r-35",
      seatpost: "oneup-v3-dropper",
      saddle: "wtb-volt",
      pedals: "crankbrothers-stamp-7",
    },
  },
  road: {
    name: "My Road Build",
    parts: {
      frame: "specialized-tarmac-sl8",
      fork: "tarmac-sl8-fork",
      wheels: "zipp-303-firecrest",
      tires: "conti-gp5000-str-28",
      groupset: "shimano-ultegra-r8100",
      crankset: "shimano-ultegra-crank",
      cassette: "shimano-ultegra-cassette",
      chain: "shimano-da-chain",
      brakes: "shimano-ultegra-br-r8170",
      handlebar: "zipp-sl70-ergo",
      stem: "zipp-sc-sl-stem",
      seatpost: "tarmac-sl8-seatpost",
      saddle: "fizik-antares-r3",
      pedals: "shimano-da-pd-r9200",
    },
  },
};

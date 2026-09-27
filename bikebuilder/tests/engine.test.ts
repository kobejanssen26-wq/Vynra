import assert from "node:assert/strict";
import { test } from "node:test";
import { parseBudget, respond } from "../src/lib/assistant/engine";
import { checkCompatibility } from "../src/lib/compatibility/engine";
import { COMMUNITY_BUILDS } from "../src/lib/community/data";
import { PRESETS } from "../src/lib/presets";
import { fitBudget, suggestUpgrades } from "../src/lib/recommend/engine";
import { STYLE_PROFILES } from "../src/lib/recommend/profiles";
import { computeStats } from "../src/lib/stats";
import { getComponent } from "../src/lib/catalog";

test("presets and community builds are fully compatible", () => {
  for (const b of [...Object.entries(PRESETS).map(([d, p]) => ({ id: d, discipline: d as "mtb" | "road", parts: p.parts })), ...COMMUNITY_BUILDS]) {
    const r = checkCompatibility(b.discipline, b.parts);
    assert.equal(r.errorCount, 0, `${b.id}: ${r.issues.map((i) => i.message).join("; ")}`);
    assert.equal(r.warningCount, 0, `${b.id}: ${r.issues.map((i) => i.message).join("; ")}`);
    for (const id of Object.values(b.parts)) assert.ok(getComponent(id), `${b.id}: unknown part ${id}`);
  }
});

test("detects real incompatibilities", () => {
  const mtb = PRESETS.mtb.parts;
  // Shimano cassette on T-Type groupset
  const t = { ...mtb, groupset: "sram-x0-transmission", crankset: "sram-x0-crank", cassette: "sram-xs1295", chain: "sram-t-type-chain" };
  assert.equal(checkCompatibility("mtb", t).errorCount, 0);
  assert.ok(checkCompatibility("mtb", { ...t, cassette: "shimano-xt-cassette" }).issues.some((i) => i.ruleId === "drivetrain-family" && i.severity === "error"));
  // 31.8 bar in a 35 stem
  assert.ok(checkCompatibility("mtb", { ...mtb, handlebar: "easton-ec90-sl-318" }).issues.some((i) => i.ruleId === "bar-clamp"));
  // ZEB needs 200 mm rotor, Level ships 160
  assert.ok(checkCompatibility("mtb", { ...mtb, fork: "rockshox-zeb-ultimate", brakes: "sram-level-ultimate" }).issues.some((i) => i.ruleId === "rotor-size"));
  // 100 mm fork on 150–160 mm frame
  assert.ok(checkCompatibility("mtb", { ...mtb, fork: "rockshox-sid-sl-ultimate" }).issues.some((i) => i.ruleId === "fork-travel" && i.severity === "error"));
  // Pike 150 is in range
  assert.equal(checkCompatibility("mtb", { ...mtb, fork: "rockshox-pike-ultimate" }).errorCount, 0);
  // Road: SRAM calipers with Shimano levers; DA wheels with XDR cassette
  const road = PRESETS.road.parts;
  assert.ok(checkCompatibility("road", { ...road, brakes: "sram-force-brakes" }).issues.some((i) => i.ruleId === "brake-system"));
  assert.ok(checkCompatibility("road", { ...road, wheels: "shimano-da-c50", groupset: "sram-red-axs-e1", crankset: "sram-red-e1-crank", cassette: "sram-red-xg1290", chain: "sram-red-flattop", brakes: "sram-red-e1-brakes" }).issues.some((i) => i.ruleId === "freehub" && i.severity === "error"));
  // Frame-specific fork / seatpost
  assert.ok(checkCompatibility("road", { ...road, fork: "aethos-fork" }).issues.some((i) => i.ruleId === "frame-specific"));
  assert.ok(checkCompatibility("road", { ...road, seatpost: "roval-alpinist-seatpost" }).issues.some((i) => i.ruleId === "seatpost"));
  // Tire clearance
  assert.ok(checkCompatibility("mtb", { ...mtb, frame: "trek-supercaliber-slr", tires: "maxxis-dhf-dhr-25" }).issues.some((i) => i.ruleId === "tire-clearance"));
});

test("stats are sums plus allowance", () => {
  const s = computeStats("mtb", PRESETS.mtb.parts);
  const sum = Object.values(PRESETS.mtb.parts).reduce((n, id) => n + getComponent(id)!.priceEur, 0);
  assert.equal(s.priceEur, sum);
  assert.ok(s.performance > 0 && s.performance <= 100);
  assert.equal(s.terrain, "All-Mountain");
  console.log("mtb preset", s);
  console.log("road preset", computeStats("road", PRESETS.road.parts));
});

test("budget optimizer keeps build compatible and reduces price", () => {
  const r = fitBudget("mtb", PRESETS.mtb.parts, 5000);
  assert.ok(r.endPriceEur < r.startPriceEur);
  assert.equal(checkCompatibility("mtb", r.selection).errorCount, 0);
  console.log(r.startPriceEur, "->", r.endPriceEur, r.reached, r.moves.map((m) => m.title));
});

test("upgrades are compatible and cost money", () => {
  const ups = suggestUpgrades("mtb", PRESETS.mtb.parts, STYLE_PROFILES.trail);
  assert.ok(ups.length > 0);
  for (const u of ups) {
    assert.ok(u.deltaPriceEur > 0);
    console.log(u.headline, u.benefit, u.deltaPriceEur, u.deltaWeightG);
  }
});

test("assistant parses budgets and styles", () => {
  assert.equal(parseBudget("My budget is €3000"), 3000);
  assert.equal(parseBudget("budget 3.500 euro"), 3500);
  assert.equal(parseBudget("around 4k"), 4000);
  assert.equal(parseBudget("I mainly ride trails"), undefined);
  const r = respond({ discipline: "mtb", selection: PRESETS.mtb.parts, message: "I mainly ride trails" });
  console.log(r.text);
  assert.ok(r.understood.some((u) => u.includes("trail")));
  const b = respond({ discipline: "mtb", selection: PRESETS.mtb.parts, message: "My budget is €5000" });
  console.log(b.text);
  assert.ok(b.swaps.length > 0);
  const road = respond({ discipline: "road", selection: PRESETS.road.parts, message: "make it lighter" });
  console.log(road.text);
});

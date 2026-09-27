# BikeBuilder AI

**Build your dream bike before you buy it.**

This is a working prototype of a platform where you plan a mountain or road bike from real components. It checks compatibility as you go, scores the build, suggests upgrades, compares builds, and shows where each part can be bought.

## Run it

```bash
cd bikebuilder
npm install
npm run dev        # http://localhost:3000
npm test           # engine tests (compatibility, scoring, optimizer, assistant)
npm run build
```

Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Framer Motion, Lucide, Zustand.

## Pages

| Route | What it does |
| --- | --- |
| `/` | Landing page: hero, feature cards, how it works, assistant showcase, community builds |
| `/builder` | The builder: live schematic bike, 14 component categories, detail/replace panel, live stats, upgrade suggestions, compatibility checks, assistant dock, save/undo |
| `/community`, `/community/builds/[id]`, `/community/riders/[username]` | Community builds, build pages (like, save, share, compare, **Copy Build**), rider profiles (follow) |
| `/compare` | Compares Bike A and Bike B: stats table, components, and a factual analysis |
| `/marketplace` | Retailer offers for every part in the current build, total vs. cheapest price |
| `/pricing`, `/login` | Plan preview with a roadmap, and the login UI |

## Architecture

```
src/lib/
  types.ts                 domain model (components, builds, users, offers, notifications)
  catalog/                 sample component catalog (MTB + road)
  compatibility/engine.ts  14 rules: wheel size, fork travel, tire clearance, UDH, drivetrain
                           family, speeds, freehub, brake system/mount, rotor size, bar clamp,
                           seatpost fit, frame-specific parts
  stats.ts                 price/weight sums + heuristic performance/comfort/durability scores
  recommend/               alternatives, upgrade suggestions, budget optimizer, explanations
  assistant/               rule-based assistant + AssistantProvider seam (served at /api/assistant)
  compare.ts               factual comparison text from the two builds' data
  marketplace/offers.ts    retailers + OfferProvider seam (demo offers today)
  services/repositories.ts repository/auth/notification interfaces for a future backend
  visualization.ts         VisualizationProvider seam for AI image generation
src/components/            ui primitives, bike renderer, builder, community, compare, marketplace
src/store/builder.ts       current build, saved builds, likes/follows/comments (localStorage)
```

## What is real and what is not yet

This prototype does not present anything as production-ready that isn't:

- **Catalog:** product names are real. Prices are indicative and weights are approximate: this is sample data (~110 parts), not a verified database. Replace it through `ComponentRepository`.
- **Compatibility:** the rules are real and deterministic. They are only as accurate as the catalog attributes.
- **Scores:** a transparent heuristic built from per-part ratings and weight, not a measurement.
- **Assistant:** a deterministic rule engine. It parses budget, style and priorities and quotes only catalog numbers. No LLM is connected; `AssistantProvider` is where one would go (use it to parse intent and write the reply, while numbers come from the engine).
- **Visualization:** a schematic SVG that is drawn from the parts: fork travel, head angle, tire width, rim depth, rotor size, bar type, dropper vs. rigid post, pedal type and frame colour all come from the selected components. Photoreal rendering is a `VisualizationProvider` seam.
- **Marketplace:** offers are generated demo prices and are labelled that way in the UI. Retailer links open a search on the retailer's site. "Add all to retailer cart" is disabled because no retailer cart API is integrated.
- **Accounts/community:** seed users and builds. Saving, likes, follows and comments live in the browser's localStorage. Login and publishing are UI only.
- **Photos:** Unsplash, via `lib/images.ts`. Swap them for licensed brand photography before launch.

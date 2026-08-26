# Nudavorae frontend challenge &middot; starter

Everything in this repository is scaffolding. None of it is the exercise, and none of it is scored.

It exists so that the time you spend on this challenge goes into the rules on page 4 of the brief, rather than into generating fixtures, hunting for font files and typing out a colour ramp. Read the brief first; this file only tells you what is in the box.

```
npm install     # nothing to fetch, the stub has no dependencies
npm start       # runs the stub, and your app too once app/ exists
```

The stub listens on **http://localhost:4010**. Every request carries `Authorization: Bearer nud_demo_7f3c`, and that literal string is the whole of authentication.

## What is in here

| | |
| --- | --- |
| `stub/server.mjs` | The API on the brief's contract page. Zero dependencies. |
| `stub/packs.seed.json` | 60 packs, committed. Same ids in the same order, every start. |
| `stub/generate-seed.mjs` | How the seed was made. You should not need it. |
| `tokens/palette.css` | The design system's **primitives**. Layer two is yours; see below. |
| `assets/fonts/` | Sora, Public Sans and IBM Plex Mono as `woff2`, plus `fonts.css`. |
| `scripts/dev.mjs` | Runs the stub and your app together. Replace it if you like. |
| `proxy.conf.example.json` | Optional. The stub sends CORS headers, so a proxy is a preference. |

There is no Angular application here on purpose. Create it in `app/` and `npm start` will pick it up:

```
npx @angular/cli@20 new app --style=css --ssr=false
```

Restructure the repository however you prefer. If you move things, say so in your README so a reviewer following the brief's two commands does not land in an empty directory.

## The three levers

They work on **any** route, by query parameter, and a reviewer will drive them without reading your code.

```
GET /packs?q=lat&delay=3000        hold the response for 3s
GET /packs?fail=503                answer 503 with a real error body
GET /packs?empty=1                 a well-formed page with no items
```

Wiring is yours, and it is part of the exercise. The brief asks that the levers are read from the **page URL** and travel to every request the app makes while they are there, because the requests that matter are ones a reviewer cannot address directly: `?q=lat&delay=3000` has to slow the search **your app** fires. They are not application state, so nothing persists them and changing one never pushes a history entry.

Some things worth knowing about how the stub behaves:

- `delay` is applied **before** the token is checked, so a delayed request takes the time it says even when it is going to fail.
- `fail` is applied **after** the token is checked, so a deliberate `500` is never a missing header in disguise.
- `empty=1` on `/packs/{id}/reviews` empties the list but leaves `can_review` alone, so you can reach "no reviews yet, and you may write the first" without editing anything.

## The seed, and what was planted in it

60 packs, deterministic, sorted by `created_at` descending under `sort=newest`.

**For RF-2**, the search fixtures are deliberate: `lat` matches **8** packs and `latex` matches **1**. The two result sets look nothing alike, which is what makes a stale response obvious on screen instead of plausible.

**For the three states**, four packs have no ratings at all (`rating: null`, all-zero distribution), and thirteen have `can_review: false` split across all three refusal reasons: `already_reviewed` (try `pack_0003`), `not_purchased` (`pack_0007`) and `pack_removed` (`pack_0028`). Every branch of the detail screen is reachable from the committed data.

Writes are held in memory and lost on restart. A review you post is gone the next time the stub starts, which is deliberate: fixtures that drift are fixtures that stop being fixtures.

## The tokens, and the layer you are expected to build

`tokens/palette.css` is layer one of two. It holds raw values and names what things **are**: `--nud-primary-600`, `--nud-space-4`, `--nud-radius-card`.

Layer two is yours, and RF-9 is about it. It names what things are **for**: `--surface-base`, `--surface-raised`, `--text-primary`, and whatever else your components turn out to need. Light composes those from `#ffffff` and the neutral ramp; dark remaps the same names onto the three dark surfaces. The rule the product itself follows, and the one being read here:

> Components never read a primitive directly.

The asymmetry in the palette is deliberate and it is the reason the second layer has to exist: there are three dark surfaces against one light one, so there is no one-to-one mapping to be found, only a composition to be made. A component that reaches past your layer for `--nud-primary-600` is a component that cannot be re-themed, and re-theming is exactly what RF-9 asks you to prove.

Do not edit `palette.css`. If you need a value that is not in it, that is a decision, and `DECISIONS.md` is where it goes.

## The fonts

Three faces, self-hosted, in `assets/fonts/` with `fonts.css` ready to import. Sora and Public Sans are variable, so one file covers the weights; Plex Mono ships as the 400 and 600 the design uses.

They are here because RF-9 forbids fetching anything from a third-party origin at runtime, and that is a product constraint rather than a preference: a stylesheet request to a font CDN hands them the address of every visitor to an adult platform. All three are under the SIL Open Font License; see `assets/fonts/LICENSE.txt` and `SOURCES.txt`.

## Changing the stub

You should not need to. If you do, say why in your README: a reviewer running your submission is running this file and expects it to behave as documented above.

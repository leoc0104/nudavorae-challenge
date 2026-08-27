# Nudavorae frontend challenge

Two screens on top of the stub in `stub/`: a catalogue of packs, and a pack
detail screen with its reviews.

## Running it

Node 22 (`.nvmrc`), then:

```
npm install     # also installs the app's dependencies
npm start       # stub on :4010, app on :4200
```

Open **http://localhost:4200**. The app is proxied onto the stub
(`app/proxy.conf.json`), so both are on one origin and the covers do not
preflight.

```
npm test        # 14 tests, headless, no browser needed
npm run lint    # eslint, plus a check that no colour value escapes the token layer
npm run build   # production build
```

## Breaking it on purpose

The stub's three levers are read from the **page** URL and travel to every
request the app makes while they are there. Put them on the address bar and
they stay through typing, sorting and paging.

| What to try | URL |
| --- | --- |
| **Slow.** Every request holds for 3s: the catalogue draws its loading state, then the results. | http://localhost:4200/?delay=3000 |
| **Failing.** Every request answers 503 with an error body, and the screen shows the stub's own message with a Try again. | http://localhost:4200/?fail=503 |
| **Empty.** A well-formed page with no items, which is a different screen from a search that found nothing. | http://localhost:4200/?empty=1 |

They compose, and they apply to the pack screen too:

- **A failing write.** http://localhost:4200/packs/pack_0001?fail=503 — write a
  review and post it. The average moves immediately, then goes back to what it
  was, and the form still has your text.
- **The stale search.** http://localhost:4200/?delay=3000 — type `lat`, wait a
  beat, then finish the word to `latex`. `lat` matches 8 packs and `latex`
  matches 1; the 8 never appear.
- **Empty after a search.** http://localhost:4200/?q=zzz — a different screen
  from `?empty=1`.

## Worth clicking

- **Back.** Open a pack from halfway down the list and press Back. Same cards,
  same scroll position, no spinner, no refetch.
- **Keyboard only.** Tab to the rating on a pack screen; it is one stop, and the
  arrow keys set the score.
- **Theme.** The control in the header is System / Light / Dark. System follows
  the OS; the choice survives a reload.
- **The three refusals.** `pack_0003` (already reviewed), `pack_0007` (not
  purchased), `pack_0028` (removed).

## Layout

```
app/          the Angular application
stub/         the starter's stub, unchanged
tokens/       the starter's primitives, unchanged
assets/fonts/ the starter's self-hosted faces, unchanged
scripts/      dev.mjs (unchanged) and the token check
DECISIONS.md  the trade-offs, under 400 words
```

Nothing in `stub/`, `tokens/` or `assets/` was modified.

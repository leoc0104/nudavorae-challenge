# Decisions

## How the stale request is cancelled (RF-2)

One `Subject` of requests feeds one `switchMap` in `CatalogueStore`. A newer
query unsubscribes the request in flight, and unsubscribing an `HttpClient`
request aborts the XHR, so a late answer has nothing listening for it. There is
no timer in that file: if the fix were a delay, the bug would still be there.
Typing is debounced 200ms before the URL is written; that is a courtesy to the
server, not the race fix, and the test drives the store past it.

## Where the RF-6 cache lives, and when it is invalidated

In `CatalogueStore`, root-provided, keyed by `sort + q`. `load()` returns
without a request when that key already holds results, so coming back from a
pack repaints memory: same items, same page, same scroll (kept in the store,
restored in `afterNextRender`). It is invalidated when `q` or `sort` changes,
which is the same moment the stub's cursor stops being valid, so there is one
rule rather than two. Covers do refetch, which `Cache-Control: private,
max-age=300` on `/media` makes free.

## At fifty thousand packs

Paging is already the server's problem and unchanged. The client's problem
becomes the DOM and the heap: 50,000 cards want windowing (`@angular/cdk`
scrolling), and `items` would stop being an unbounded array — the cache would
keep a window around the restored offset and evict the rest, so RF-6 restores a
position rather than a whole list. Covers would fetch on intersection, with
object URLs revoked as cards leave the window. Search would need a minimum
length and a server-side index.

## Assumptions

- `already_reviewed` renders the prefilled "change your review" form, since the
  brief names that as one of the three answers. The stub answers 409 to that
  POST; the rollback then shows its message, which is the honest outcome.
- Sort pushes a history entry, typing replaces one: one is a deliberate act.
- A proxy, not direct CORS: an `Authorization` header cross-origin preflights
  every cover.
- Levers merge into every navigation, so typing never drops a `?delay=`.
- No `ChangeDetectorRef` anywhere, so none is owed a sentence.

## Not done

Virtualisation, upload, checkout, auth beyond the hardcoded token, SSR, i18n.
No cover placeholder art beyond an empty tinted box. The `unit-test` builder is
experimental. Covers are not retried when a fetch fails.

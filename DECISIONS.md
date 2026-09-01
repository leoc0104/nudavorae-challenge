# Decisions

## Cancelling the stale request (RF-2)

One `Subject` feeds one `switchMap` in `CatalogueStore`. A newer query
unsubscribes the request in flight, and unsubscribing an `HttpClient` request
aborts the XHR, so a late answer has nothing listening for it. No timer appears
in that file: if the fix were a delay, the bug would still be there. Typing is
debounced 200ms before the URL is written: a courtesy to the server, not the
race fix.

The effect calling `load()` wraps it in `untracked`. Otherwise `load()` reading
the store's status makes it a dependency, and a failure re-triggers the effect
that asked for it: infinite retries behind a loading state that never resolves.
`catalogue-page.spec.ts` pins that.

## Where the RF-6 cache lives, and when it dies

In `CatalogueStore`, root-provided, keyed by `sort + q`. `load()` returns
without a request when that key already holds results, so returning from a pack
repaints memory: same items, same page, same scroll. It is invalidated when `q`
or `sort` changes, the same moment the stub's cursor stops being valid, so there
is one rule rather than two. Scroll is captured on `NavigationStart`, not on
destroy: by destroy the next screen is laid out and the browser has clamped
`scrollY` to it. Covers refetch, which `max-age=300` makes free.

## At fifty thousand packs

Paging stays the server's problem. The client's becomes the DOM and the heap:
50,000 cards want windowing, and `items` would stop being an unbounded array.
The cache would keep a window around the restored offset and evict the rest, so
RF-6 would restore a position rather than a list. Covers would fetch on
intersection, object URLs revoked as cards leave it.

## Assumptions

- The brief names three answers; the contract supports two. There is no edit
  endpoint, and POST answers 409 whenever `can_review` is false, so "change the
  one you left" cannot succeed. The screen shows the refusal and points at the
  review instead of offering a Save button guaranteed to fail.
- Sort pushes a history entry; typing replaces one.
- A proxy, not direct CORS: an `Authorization` header cross-origin preflights
  every cover. It collides with the app's `/packs/:id`, so the proxy bypasses to
  the shell for `text/html`, and Angular's font output moves off `media/`.
- No `ChangeDetectorRef` anywhere.

## Not done

Virtualisation, upload, checkout, auth beyond the token, SSR, i18n. Covers are
not retried on failure. The `unit-test` builder is experimental.

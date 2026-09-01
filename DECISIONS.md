# Decisions

## Cancelling the stale request

One `Subject` feeds one `switchMap` in `CatalogueStore`. A newer query
unsubscribes the one in flight, and unsubscribing an `HttpClient` request aborts
the XHR, so a late answer has nothing listening for it. No timer appears: if the
fix were a delay, the bug would still be there. The 200ms debounce is a courtesy
to the server, not the fix.

The effect calling `load()` wraps it in `untracked`. Otherwise `load()` reading
the store's status makes it a dependency and a failure re-triggers the effect
that asked for it: infinite retries behind a loading state that never resolves.
Pinned by a spec.

## Where the RF-6 cache lives

In `CatalogueStore`, root-provided, keyed by `sort + q`. `load()` returns
without a request when that key already holds results, so returning from a pack
repaints memory: same items, same page, same scroll. It dies when `q` or `sort`
changes, the moment the stub's cursor stops being valid: one rule, not two.
Scroll is captured on `NavigationStart`: by destroy the browser has already
clamped `scrollY` to the next screen. Covers refetch, which `max-age=300` makes
free.

## At fifty thousand packs

Paging stays the server's problem. The client's becomes the DOM and the heap:
50,000 cards want windowing, and `items` would stop being unbounded. The cache
would keep a window around the restored offset and evict the rest, so RF-6 would
restore a position, not a list. Covers would fetch on intersection.

## Assumptions

- The brief names three answers; the contract supports two. There is no edit
  endpoint, and POST answers 409 whenever `can_review` is false, so "change the
  one you left" cannot succeed. The screen shows the refusal and points at the
  review rather than a Save button guaranteed to fail.
- Sort pushes a history entry; typing replaces one.
- A proxy, not direct CORS: an `Authorization` header cross-origin preflights
  every cover. It collides with the app's `/packs/:id`, so the proxy serves the
  shell for `text/html`, and Angular's fonts move off `media/`.
- The sort stays a native `<select>`; only its closed state is styled. The open
  list is the OS's and cannot be themed, but replacing it means rebuilding
  keyboard, screen-reader and mobile behaviour and disabling two a11y lint
  rules, for a control nothing scores.
- No `ChangeDetectorRef` anywhere.

## Not done

Virtualisation, upload, checkout, auth, SSR, i18n. Covers are not retried. The
`unit-test` builder is experimental.

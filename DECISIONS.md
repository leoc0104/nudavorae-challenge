# Decisions

## Cancelling the stale request

One `Subject` feeds one `switchMap` in `CatalogueStore`. A newer query
unsubscribes the one in flight, and unsubscribing an `HttpClient` request aborts
the XHR, so a late answer has nothing listening. No timer appears: if the fix
were a delay, the bug would still be there.

`load()` is called inside `untracked`. Otherwise it reads the store's status,
that becomes a dependency of the effect, and a failure re-triggers the effect
that caused it — endless retries behind a permanent loading state.

## The RF-6 cache: where it lives, when it dies

In `CatalogueStore`, root-provided, keyed by `sort + q`. `load()` returns
without a request when that key already holds results, so Back repaints memory:
same items, same page, no spinner. It dies when `q` or `sort` changes, the
moment the stub's cursor also expires, so one rule covers both. Scroll is
captured on `NavigationStart`: by destroy the browser has clamped `scrollY` to
the next screen. Covers refetch, which `max-age=300` makes free.

## At fifty thousand packs

Paging stays the server's problem; the client's becomes the DOM and the heap.
Cards want windowing and `items` stops being unbounded: the cache would keep a
window around the restored offset and evict the rest, so RF-6 restores a
position, not a list. Covers would fetch on intersection.

## Assumptions

- Three answers in the brief, two in the contract. There is no edit endpoint,
  and POST answers 409 whenever `can_review` is false, so "change the one you
  left" cannot succeed. The screen shows the refusal instead.
- The form is withdrawn only once the server has taken the review. Doing it
  optimistically unmounts it mid-request and destroys the draft.
- Sort pushes a history entry; typing replaces one.
- A proxy, not direct CORS: the `Authorization` header would preflight every
  cover. It collides with the app's `/packs/:id`, so it serves the shell for
  `text/html`, and Angular's fonts move off `media/`.
- The sort stays a native `<select>`. Replacing it means rebuilding keyboard,
  screen-reader and mobile behaviour and disabling two a11y lint rules, for a
  control nothing scores.
- No `ChangeDetectorRef` anywhere.

## What I did not do

Three tests, not coverage: RF-2's stale answer, RF-7's double send, RF-4's
keyboard path, each verified by reintroducing its bug. Nothing pins RF-5's
rollback or the RF-6 cache. No virtualisation, upload, checkout, auth, SSR or
i18n. Covers are not retried. Safari is untested.

# Decisions

## Cancelling the stale request

One `Subject` feeds one `switchMap` in `CatalogueStore`. A newer query
unsubscribes the one in flight, which aborts the XHR, so a late answer has
nothing listening. No timer: if the fix were a delay, the bug would still be
there.

`load()` is called inside `untracked`. Otherwise it reads the store's status,
that becomes an effect dependency, and a failure re-triggers the effect that
caused it: endless retries behind a permanent loading state.

## The RF-6 cache: where it lives, when it dies

In `CatalogueStore`, root-provided, keyed by `sort + q`. `load()` returns
without a request when that key already holds results, so Back repaints memory:
same items, same page, no spinner. It dies when `q` or `sort` changes — the
moment the cursor also expires: one rule, not two. Scroll is captured on
`NavigationStart` because by destroy the browser has clamped `scrollY` to the
next screen. Covers refetch, which `max-age=300` makes free.

## At fifty thousand packs

The server is fine: cursor paging works at any size. The browser is not. 50,000
cards is too many DOM nodes, and `items` grows forever, so it needs virtual
scrolling and a capped cache around where the user was. Back then restores a
position and refetches it, not replaying a list it cannot hold. Covers load only
when scrolled into view.

## Assumptions

- Three answers in the brief, two in the contract. There is no edit endpoint,
  and POST answers 409 when `can_review` is false, so "change the one you left"
  cannot succeed. The screen shows the refusal instead.
- The form is withdrawn only once the server has taken the review. Doing it
  optimistically unmounts it mid-request and loses the draft.
- Sort pushes a history entry; typing replaces one.
- A proxy, not direct CORS: the `Authorization` header would preflight every
  cover. It collides with the app's `/packs/:id`, so it serves the shell for
  `text/html`. Fonts move off `media/`.
- The sort stays a native `<select>`. Replacing it means rebuilding keyboard,
  screen-reader and mobile behaviour and disabling two a11y lint rules — for a
  control nothing scores.
- No `ChangeDetectorRef` anywhere.

## What I did not do

Three tests, not coverage — RF-2's stale answer, RF-7's double send, RF-4's
keyboard path, each verified by reintroducing its bug. Nothing pins RF-5's
rollback or the RF-6 cache. No virtualisation, upload, checkout, auth, SSR or
i18n. Safari is untested.

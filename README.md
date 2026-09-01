# Nudavorae frontend challenge

## Running it

Node 22, then from the repository root:

```
npm install
npm start
```

The stub starts on port 4010 and the app on port 4200. Open
**http://localhost:4200**.

```
npm test
```

## The three levers

They are read from the page URL and travel to every request the app makes while
they are there, so they survive typing, sorting and paging.

### `?delay=<ms>`

**http://localhost:4200/?delay=3000**

Every request is held for three seconds. The catalogue draws its loading state,
then replaces it with the results.

### `?fail=<status>`

**http://localhost:4200/?fail=503**

Every request answers with that status and an error body. The catalogue shows
the failed state carrying the stub's own message, and a Try again button.

### `?empty=1`

**http://localhost:4200/?empty=1**

A well-formed page with no items. This is the empty catalogue, which is a
different screen from a search that matched nothing (`?q=zzz`).

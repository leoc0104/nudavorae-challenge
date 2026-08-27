import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, of, switchMap } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiError } from '../../core/api/api-error';
import { PackCard, Sort } from '../../core/api/contract';
import { PacksApi } from '../../core/api/packs-api';

export interface CatalogueQuery {
  readonly q: string;
  readonly sort: Sort;
}

export type CatalogueStatus = 'idle' | 'loading' | 'ready' | 'failed';

/** What the cursor is valid for. The stub invalidates it when either changes. */
const keyOf = ({ q, sort }: CatalogueQuery): string => `${sort} ${q}`;

type Request =
  | { readonly kind: 'replace'; readonly query: CatalogueQuery }
  | { readonly kind: 'append'; readonly query: CatalogueQuery; readonly cursor: string };

/**
 * The catalogue's results, held for as long as the app is running.
 *
 * This is the root-provided service holding signals that the brief says it
 * expects to see instead of a store library. RF-6 requires exactly such a
 * thing, because "back returns to the list as it was" is only possible if the
 * list outlives the component that drew it.
 *
 * Three rules are enforced here rather than in a component:
 *
 * RF-2  One Subject feeds one switchMap, so a request that is no longer wanted
 *       is unsubscribed, and unsubscribing an HttpClient request cancels it.
 *       A late answer to an old question cannot land because nothing is
 *       listening for it any more. There is no timer in this file: if the fix
 *       were a delay, the bug would still be there.
 *
 * RF-6  load() is a no-op when the results in hand already belong to the query
 *       being asked for. Returning from a pack therefore paints the cards that
 *       are already in memory, at the page they were paged to, with no request
 *       and so no flash of a spinner.
 *
 *       The cache is exactly this instance, keyed by sort and q. It is
 *       invalidated by a change to either, which is also the moment the cursor
 *       stops being valid: one rule rather than two.
 */
@Injectable({ providedIn: 'root' })
export class CatalogueStore {
  private readonly api = inject(PacksApi);
  private readonly requests$ = new Subject<Request>();

  private readonly _query = signal<CatalogueQuery>({ q: '', sort: 'newest' });
  private readonly _items = signal<readonly PackCard[]>([]);
  private readonly _nextCursor = signal<string | null>(null);
  private readonly _status = signal<CatalogueStatus>('idle');
  private readonly _error = signal<ApiError | null>(null);
  private readonly _appending = signal(false);
  private readonly _appendError = signal<ApiError | null>(null);
  private readonly _loadedKey = signal<string | null>(null);
  private readonly _scrollY = signal(0);

  readonly query = this._query.asReadonly();
  readonly items = this._items.asReadonly();
  readonly status = this._status.asReadonly();
  readonly error = this._error.asReadonly();
  readonly appending = this._appending.asReadonly();
  readonly appendError = this._appendError.asReadonly();

  readonly hasMore = computed(() => this._nextCursor() !== null);
  readonly isEmpty = computed(() => this._status() === 'ready' && this._items().length === 0);
  /** An empty result after a search is a different screen from an empty catalogue. */
  readonly isSearch = computed(() => this._query().q !== '');
  readonly count = computed(() => this._items().length);

  constructor() {
    this.requests$
      .pipe(
        switchMap((request) =>
          this.api
            .listPacks({
              ...request.query,
              cursor: request.kind === 'append' ? request.cursor : null,
            })
            .pipe(
              map((page) => ({ request, page, error: null }) as const),
              catchError((cause: unknown) =>
                of({ request, page: null, error: cause as ApiError } as const),
              ),
            ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ request, page, error }) => {
        if (request.kind === 'append') {
          this._appending.set(false);
          if (page === null) {
            this._appendError.set(error);
            return;
          }
          this._items.update((current) => [...current, ...page.items]);
          this._nextCursor.set(page.next_cursor);
          return;
        }

        if (page === null) {
          this._status.set('failed');
          this._error.set(error);
          return;
        }
        this._items.set(page.items);
        this._nextCursor.set(page.next_cursor);
        this._status.set('ready');
      });
  }

  /**
   * Called with whatever the URL currently says. Returns without touching the
   * network when the results in hand already answer it, and that early return
   * is RF-6.
   */
  load(query: CatalogueQuery): void {
    if (keyOf(query) === this._loadedKey() && this._status() !== 'failed') return;
    this.fetchFirstPage(query);
  }

  /** Retry after a failure re-asks the same question, cache check bypassed. */
  retry(): void {
    this.fetchFirstPage(this._query());
  }

  loadMore(): void {
    const cursor = this._nextCursor();
    // One page at a time: a second click while the first is in flight would
    // send the same cursor twice and duplicate a page into the list.
    if (cursor === null || this._appending()) return;

    this._appending.set(true);
    this._appendError.set(null);
    this.requests$.next({ kind: 'append', query: this._query(), cursor });
  }

  /** RF-6: remembered on the way out, restored on the way back in. */
  rememberScroll(y: number): void {
    this._scrollY.set(y);
  }

  scrollY(): number {
    return this._scrollY();
  }

  private fetchFirstPage(query: CatalogueQuery): void {
    this._query.set(query);
    this._loadedKey.set(keyOf(query));
    this._status.set('loading');
    this._error.set(null);
    this._appendError.set(null);
    this._appending.set(false);
    // The old query's cards are dropped now rather than when the answer
    // arrives, so a loading state is never drawn over results for a question
    // the user has already replaced.
    this._items.set([]);
    this._nextCursor.set(null);
    this._scrollY.set(0);

    this.requests$.next({ kind: 'replace', query });
  }
}

import { LiveAnnouncer } from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { SORTS, Sort, isSort } from '../../core/api/contract';
import { PackCardComponent } from './pack-card';
import { CatalogueStore } from './catalogue-store';

/** Long enough not to fire per keystroke, short enough to feel immediate. */
const TYPING_SETTLE_MS = 200;

const SORT_LABELS: Readonly<Record<Sort, string>> = {
  newest: 'Newest',
  price_asc: 'Price: low to high',
  price_desc: 'Price: high to low',
  rating: 'Highest rated',
};

/**
 * RF-1. The URL is the state: q and sort live in it, so a reload reproduces
 * what was on screen and a pasted link opens the same results for someone else.
 * This component never holds the query, it only reads it from the route and
 * writes it back.
 *
 * Typing replaces the current history entry rather than pushing one, so a
 * search does not bury the previous page under a stack of keystrokes. Choosing
 * a sort is a deliberate act and does push, so Back undoes it.
 *
 * Every navigation merges rather than replaces the query string, which is what
 * keeps a reviewer's ?delay= / ?fail= / ?empty= alive while they type. Dropping
 * them on the first keystroke would make the levers look like they work and
 * quietly stop them.
 */
@Component({
  selector: 'nud-catalogue-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PackCardComponent],
  templateUrl: './catalogue-page.html',
  styleUrl: './catalogue-page.css',
})
export class CataloguePage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly announcer = inject(LiveAnnouncer);
  protected readonly store = inject(CatalogueStore);

  protected readonly sorts = SORTS;
  protected readonly sortLabels = SORT_LABELS;

  private readonly params = toSignal(this.route.queryParamMap, { requireSync: true });

  /** The question the URL is asking. The only source of truth for it. */
  protected readonly q = computed(() => this.params().get('q') ?? '');
  protected readonly sort = computed<Sort>(() => {
    const value = this.params().get('sort');
    return isSort(value) ? value : 'newest';
  });

  /** What is in the box right now, which runs slightly ahead of the URL. */
  protected readonly searchText = signal('');

  private readonly typed$ = new Subject<string>();
  private lastAnnounced = '';

  protected readonly heading = computed(() =>
    this.q() === '' ? 'All packs' : `Results for "${this.q()}"`,
  );

  /** What a screen reader is told when one state replaces another (RF-4). */
  protected readonly stateMessage = computed(() => {
    const query = this.q();
    switch (this.store.status()) {
      case 'idle':
        return '';
      case 'loading':
        return query === '' ? 'Loading packs.' : `Searching for ${query}.`;
      case 'failed':
        return `Could not load packs. ${this.store.error()?.message ?? ''}`.trim();
      case 'ready': {
        const count = this.store.count();
        if (count === 0) {
          return query === '' ? 'The catalogue is empty.' : `No packs match ${query}.`;
        }
        const noun = count === 1 ? 'pack' : 'packs';
        const more = this.store.hasMore() ? ', more available' : '';
        return query === ''
          ? `${count} ${noun} shown${more}.`
          : `${count} ${noun} match ${query}${more}.`;
      }
    }
  });

  constructor() {
    // The URL asks; the store answers, and declines to re-ask a question it is
    // already holding the answer to (RF-6).
    effect(() => this.store.load({ q: this.q(), sort: this.sort() }));

    // Back, forward, or a pasted link changes the URL under the box.
    effect(() => {
      const fromUrl = this.q();
      untracked(() => {
        if (this.searchText() !== fromUrl) this.searchText.set(fromUrl);
      });
    });

    effect(() => {
      const message = this.stateMessage();
      if (message === '' || message === this.lastAnnounced) return;
      this.lastAnnounced = message;
      this.announcer.announce(message, 'polite');
    });

    this.typed$
      .pipe(debounceTime(TYPING_SETTLE_MS), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((q) => this.writeQuery({ q: q === '' ? null : q }, true));

    // RF-6: come back to the same scroll position, not the top of the list.
    afterNextRender(() => {
      const y = this.store.scrollY();
      if (y > 0) window.scrollTo({ top: y, behavior: 'instant' });
    });

    inject(DestroyRef).onDestroy(() => this.store.rememberScroll(window.scrollY));
  }

  protected onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchText.set(value);
    this.typed$.next(value);
  }

  protected onSortChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (!isSort(value)) return;
    // A deliberate choice, so it earns a history entry.
    this.writeQuery({ sort: value === 'newest' ? null : value }, false);
  }

  protected clearSearch(): void {
    this.searchText.set('');
    this.typed$.next('');
  }

  private writeQuery(queryParams: Record<string, string | null>, replaceUrl: boolean): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      // Keeps the reviewer's levers on the URL while the app rewrites q/sort.
      queryParamsHandling: 'merge',
      replaceUrl,
    });
  }
}

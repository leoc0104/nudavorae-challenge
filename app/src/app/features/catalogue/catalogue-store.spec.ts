import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { PackCard, PackPage } from '../../core/api/contract';
import { CatalogueStore } from './catalogue-store';

/**
 * RF-2. "Type lat, then latex, with the first response delayed. The results for
 * lat must never appear." The brief calls this the single most common way to
 * fail the challenge, so it is pinned here.
 *
 * The seed makes the failure loud rather than plausible: lat matches 8 packs
 * and latex matches 1, so a stale answer landing is unmissable on screen.
 */

const card = (id: string, title: string): PackCard => ({
  id,
  title,
  creator_handle: '@lumen_ash',
  price_cents: 1999,
  cover_media_id: `media_${id}`,
  rating: '4.8',
  review_count: 12,
});

const page = (items: readonly PackCard[]): PackPage => ({ items, next_cursor: null });

/** What 'lat' matches: eight packs, none of which may ever reach the screen. */
const LAT_RESULTS = Array.from({ length: 8 }, (_, i) => card(`pack_lat_${i}`, `Latitude ${i}`));
const LATEX_RESULTS = [card('pack_latex', 'Latex, in detail')];

describe('CatalogueStore (RF-2: a late answer to an old question never lands)', () => {
  let store: CatalogueStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(CatalogueStore);
    http = TestBed.inject(HttpTestingController);
  });

  const requestFor = (q: string): TestRequest =>
    http.expectOne((request) => request.url === '/packs' && request.params.get('q') === q);

  const ids = (): readonly string[] => store.items().map((item) => item.id);

  it('abandons the request for the replaced query and shows only the current results', () => {
    // The user types "lat". Its answer is going to be slow.
    store.load({ q: 'lat', sort: 'newest' });
    const stale = requestFor('lat');
    expect(stale.cancelled).toBe(false);

    // Before that answer arrives, they finish the word.
    store.load({ q: 'latex', sort: 'newest' });

    // switchMap unsubscribed the first request, and unsubscribing an HttpClient
    // request cancels the XHR. This assertion is the whole rule: nothing is
    // listening for "lat" any more, so its answer has nowhere to land.
    expect(stale.cancelled).toBe(true);

    // And it genuinely cannot be delivered, late or otherwise.
    expect(() => stale.flush(page(LAT_RESULTS))).toThrowError(/cancelled/i);

    requestFor('latex').flush(page(LATEX_RESULTS));

    expect(ids()).toEqual(['pack_latex']);
    expect(store.status()).toBe('ready');
  });

  it('keeps the newer results even when the stale request is the one that resolves last', () => {
    store.load({ q: 'lat', sort: 'newest' });
    const stale = requestFor('lat');

    store.load({ q: 'latex', sort: 'newest' });
    const current = requestFor('latex');

    // Answers come back in the wrong order: the newer one first.
    current.flush(page(LATEX_RESULTS));
    expect(ids()).toEqual(['pack_latex']);

    // Then the old one tries to arrive. It is already cancelled, so the screen
    // cannot be overwritten by results for a question the user has replaced.
    expect(stale.cancelled).toBe(true);
    expect(ids()).toEqual(['pack_latex']);
    expect(store.query().q).toBe('latex');
  });

  it('cancels an in-flight page of load-more when the query changes underneath it', () => {
    store.load({ q: 'lat', sort: 'newest' });
    requestFor('lat').flush({ items: LAT_RESULTS, next_cursor: 'cursor_page_2' });

    store.loadMore();
    const stalePage = http.expectOne((request) => request.params.get('cursor') === 'cursor_page_2');

    // A second page for "lat" must not be appended to the results for "latex".
    store.load({ q: 'latex', sort: 'newest' });
    expect(stalePage.cancelled).toBe(true);

    requestFor('latex').flush(page(LATEX_RESULTS));
    expect(ids()).toEqual(['pack_latex']);
  });

  it('serves a repeated query from memory without a request (RF-6)', () => {
    store.load({ q: 'lat', sort: 'newest' });
    requestFor('lat').flush(page(LAT_RESULTS));
    expect(ids()).toHaveLength(8);

    // Coming back from a pack asks for the same query. No request may leave.
    store.load({ q: 'lat', sort: 'newest' });

    http.verify();
    expect(ids()).toHaveLength(8);
    expect(store.status()).toBe('ready');
  });

  afterEach(() => {
    http.verify({ ignoreCancelled: true });
  });
});

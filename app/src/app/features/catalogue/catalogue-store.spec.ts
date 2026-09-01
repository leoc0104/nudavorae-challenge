import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PackCard } from '../../core/api/contract';
import { CatalogueStore } from './catalogue-store';

/**
 * RF-2, the first of the two tests the brief chose.
 *
 *   "Type lat, then latex, with the first response delayed. The results for lat
 *    must never appear. Ships as a test. This is the single most common way to
 *    fail this challenge."
 *
 * The seed is built to make the failure loud rather than plausible: lat matches
 * eight packs and latex matches one, so a stale answer landing is unmistakable
 * both on screen and here.
 */

const card = (id: string, title: string): PackCard => ({
  id,
  title,
  creator_handle: 'still_orbit',
  price_cents: 1999,
  cover_media_id: `media_${id}`,
  rating: '4.2',
  review_count: 7,
});

/** What "lat" matches. None of these may ever reach the screen. */
const LAT = Array.from({ length: 8 }, (_, i) => card(`pack_lat_${i}`, `Latitude ${i}`));
const LATEX = [card('pack_latex', 'Latex, in detail')];

describe('RF-2: a late answer to an old question never lands', () => {
  let store: CatalogueStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(CatalogueStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify({ ignoreCancelled: true }));

  const requestFor = (q: string): TestRequest =>
    http.expectOne((request) => request.url === '/packs' && request.params.get('q') === q);

  it('shows the results for latex, and never the results for lat', () => {
    // The user types "lat". Its answer is going to be slow.
    store.load({ q: 'lat', sort: 'newest' });
    const stale = requestFor('lat');
    expect(stale.cancelled).toBe(false);

    // Before that answer arrives, they finish the word.
    store.load({ q: 'latex', sort: 'newest' });
    const current = requestFor('latex');

    // switchMap unsubscribed the first request, and unsubscribing an HttpClient
    // request aborts the XHR. This assertion is the whole rule: nothing is
    // listening for "lat" any more, so its answer has nowhere to land.
    expect(stale.cancelled).toBe(true);

    // The answers come back in the wrong order: the newer one first...
    current.flush({ items: LATEX, next_cursor: null });
    expect(store.items().map((p) => p.id)).toEqual(['pack_latex']);

    // ...and then the stale one tries to arrive. It cannot even be delivered.
    expect(() => stale.flush({ items: LAT, next_cursor: null })).toThrowError(/cancelled/i);

    // The screen still shows the answer to the question actually being asked.
    expect(store.items().map((p) => p.id)).toEqual(['pack_latex']);
    expect(store.query().q).toBe('latex');
    expect(store.status()).toBe('ready');
  });
});

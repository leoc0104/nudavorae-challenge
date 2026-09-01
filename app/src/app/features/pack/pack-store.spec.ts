import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Distribution, PackDetail, ReviewsResponse } from '../../core/api/contract';
import { PackStore } from './pack-store';

/**
 * RF-7, the second of the two tests the brief chose.
 *
 *   "Double-click the button, or press enter again while the first request is
 *    in flight: one request leaves the browser."
 *
 * The guard is in the store, not on the button, and that is what is pinned
 * here. A disabled attribute is applied on the next render, which is a frame
 * too late for a real double-click, so asserting on the button would prove the
 * wrong thing.
 */

const ID = 'pack_0001';
const DISTRIBUTION: Distribution = { '1': 0, '2': 0, '3': 1, '4': 0, '5': 1 };

const PACK: PackDetail = {
  id: ID,
  title: 'Latitude, Late',
  creator_handle: 'still_orbit',
  price_cents: 2999,
  cover_media_id: 'media_0001',
  rating: '4.0',
  review_count: 2,
  description: 'Seventy-two files, delivered privately and watermarked per buyer.',
  distribution: DISTRIBUTION,
  created_at: '2026-01-01T00:00:00.000Z',
};

const REVIEWS: ReviewsResponse = {
  items: [],
  can_review: true,
  rating: '4.0',
  review_count: 2,
};

describe('RF-7: the review form cannot be sent twice', () => {
  let store: PackStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        PackStore,
      ],
    });
    store = TestBed.inject(PackStore);
    http = TestBed.inject(HttpTestingController);

    store.load(ID);
    http.expectOne(`/packs/${ID}`).flush(PACK);
    http.expectOne(`/packs/${ID}/reviews`).flush(REVIEWS);
  });

  afterEach(() => http.verify());

  it('sends one request however many times submit is called before it answers', () => {
    const review = { score: 5, body: 'Excellent.' } as const;

    // The double-click, and then a third for good measure.
    store.submit(ID, review);
    store.submit(ID, review);
    store.submit(ID, review);

    const posts = http.match((request) => request.method === 'POST');
    expect(posts).toHaveLength(1);

    posts[0].flush({ rating: '4.3', review_count: 3 }, { status: 201, statusText: 'Created' });
    expect(store.submitting()).toBe(false);
  });
});

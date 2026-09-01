import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Distribution, PackDetail, ReviewsResponse } from '../../core/api/contract';
import { PackStore, averageOf } from './pack-store';

/**
 * RF-7: the review form cannot be sent twice. "Double-click the button, or
 * press enter again while the first request is in flight: one request leaves
 * the browser."
 *
 * The guard is in the store rather than on the button, so this is where it is
 * pinned. A disabled attribute is applied on the next render, which is a frame
 * too late for a real double-click, and testing the attribute would prove the
 * wrong thing.
 *
 * RF-5's rollback is here too, because it is the same write.
 */

const ID = 'pack_0001';

const DISTRIBUTION: Distribution = { '1': 0, '2': 0, '3': 1, '4': 0, '5': 1 };

const PACK: PackDetail = {
  id: ID,
  title: 'Latitude, in full',
  creator_handle: '@lumen_ash',
  price_cents: 1999,
  cover_media_id: 'media_0001',
  rating: '4.0',
  review_count: 2,
  description: 'Forty files, delivered privately and watermarked per buyer.',
  distribution: DISTRIBUTION,
  created_at: '2026-01-01T00:00:00.000Z',
};

const REVIEWS: ReviewsResponse = {
  items: [
    {
      id: 'rev_1',
      author_handle: '@ora_vex',
      score: 3,
      body: 'Fine.',
      created_at: '2026-01-02T00:00:00.000Z',
    },
    {
      id: 'rev_2',
      author_handle: '@nell_dusk',
      score: 5,
      body: 'Worth it.',
      created_at: '2026-01-03T00:00:00.000Z',
    },
  ],
  can_review: true,
  rating: '4.0',
  review_count: 2,
};

describe('PackStore', () => {
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

  const posts = () => http.match((request) => request.method === 'POST');

  describe('RF-7: the double send', () => {
    it('sends one request when submit is called twice before the first answers', () => {
      store.submit(ID, { score: 5, body: 'Excellent.' });
      store.submit(ID, { score: 5, body: 'Excellent.' });
      store.submit(ID, { score: 5, body: 'Excellent.' });

      const inFlight = posts();
      expect(inFlight).toHaveLength(1);

      inFlight[0].flush({ rating: '4.3', review_count: 3 }, { status: 201, statusText: 'Created' });
      expect(store.submitting()).toBe(false);
    });

    it('allows a fresh attempt once the first one has failed', () => {
      store.submit(ID, { score: 5, body: 'Excellent.' });
      const first = posts();
      expect(first).toHaveLength(1);

      first[0].flush(
        { error: { code: 'forced_failure', message: 'The stub was asked for a 500.' } },
        { status: 500, statusText: 'Server Error' },
      );

      // The guard released with the request, so the user can try again.
      expect(store.submitting()).toBe(false);
      store.submit(ID, { score: 5, body: 'Excellent.' });
      expect(posts()).toHaveLength(1);
    });
  });

  describe('RF-5: the optimistic write and its rollback', () => {
    it('moves the average at once and puts everything back when the write fails', () => {
      expect(store.rating()).toBe('4.0');
      expect(store.reviewCount()).toBe(2);

      store.submit(ID, { score: 5, body: 'Excellent.' });

      // Optimistic, and using the same arithmetic the stub uses so the number
      // does not visibly jump when the real answer lands: (3+5+5)/3 = 4.333 -> 4.3
      expect(store.rating()).toBe('4.3');
      expect(store.reviewCount()).toBe(3);
      expect(store.distribution()['5']).toBe(2);
      expect(store.reviews()).toHaveLength(3);
      expect(store.pendingReviewId()).not.toBeNull();

      posts()[0].flush(
        { error: { code: 'forced_failure', message: 'The stub was asked for a 503.' } },
        { status: 503, statusText: 'Service Unavailable' },
      );

      // The screen returns to the truth, exactly.
      expect(store.rating()).toBe('4.0');
      expect(store.reviewCount()).toBe(2);
      expect(store.distribution()).toEqual(DISTRIBUTION);
      expect(store.reviews()).toHaveLength(2);
      expect(store.pendingReviewId()).toBeNull();
      expect(store.canReview()).toBe(true);

      // And it says what happened, in the server's words.
      expect(store.submitError()?.message).toBe('The stub was asked for a 503.');
    });

    it('takes the server numbers over the guessed ones when the write succeeds', () => {
      store.submit(ID, { score: 5, body: 'Excellent.' });
      posts()[0].flush({ rating: '4.3', review_count: 3 }, { status: 201, statusText: 'Created' });

      expect(store.rating()).toBe('4.3');
      expect(store.reviewCount()).toBe(3);
      expect(store.pendingReviewId()).toBeNull();
      expect(store.canReview()).toBe(false);
      expect(store.submitError()).toBeNull();

      // The stub answers 409 to any further POST, so the screen must stop
      // offering a form. Showing an editable one here would put a Save button
      // on screen that is guaranteed to fail.
      expect(store.formMode()).toBe('refused');
      expect(store.reason()).toBe('already_reviewed');
      // The review itself is still attributed, so the refusal can point at it.
      expect(store.ownReview()?.body).toBe('Excellent.');
    });
  });

  it('mirrors the stub arithmetic for an unrated pack', () => {
    expect(averageOf({ '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 })).toEqual({
      rating: null,
      total: 0,
    });
    expect(averageOf({ '1': 0, '2': 0, '3': 0, '4': 1, '5': 4 }).rating).toBe('4.8');
  });
});

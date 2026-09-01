import { Injectable, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ApiError } from '../../core/api/api-error';
import {
  Distribution,
  NewReview,
  PackDetail,
  Rating,
  RefusalReason,
  Review,
  ReviewsResponse,
  Score,
} from '../../core/api/contract';
import { PacksApi } from '../../core/api/packs-api';

export type PackStatus = 'idle' | 'loading' | 'ready' | 'failed';

/** The handle the stub gives a review written by the caller. */
const SELF = 'you';

/**
 * The stub's own arithmetic, mirrored exactly. If this rounded differently, the
 * optimistic average would disagree with the confirmed one and the number would
 * visibly jump when the answer arrived, which is its own small lie.
 */
export function averageOf(distribution: Distribution): { rating: Rating; total: number } {
  const entries = Object.entries(distribution) as [string, number][];
  const total = entries.reduce((n, [, count]) => n + count, 0);
  if (total === 0) return { rating: null, total: 0 };
  const sum = entries.reduce((n, [score, count]) => n + Number(score) * count, 0);
  return { rating: (Math.round((sum / total) * 10) / 10).toFixed(1), total };
}

/** Everything a failed write has to put back. */
interface Snapshot {
  readonly rating: Rating;
  readonly reviewCount: number;
  readonly distribution: Distribution;
  readonly reviews: readonly Review[];
  readonly canReview: boolean;
  readonly reason: RefusalReason | null;
}

/**
 * The pack screen's state. Provided by the route component rather than the root
 * injector: unlike the catalogue, nothing here needs to outlive the screen.
 *
 * RF-5 is the whole point of this file. The average moves the moment the review
 * is submitted, and if the request fails every one of those numbers goes back
 * to what the server last told us and the screen says why. An optimistic update
 * with no rollback is worse than no optimistic update.
 */
@Injectable()
export class PackStore {
  private readonly api = inject(PacksApi);

  private readonly _status = signal<PackStatus>('idle');
  private readonly _error = signal<ApiError | null>(null);
  private readonly _pack = signal<PackDetail | null>(null);
  private readonly _reviews = signal<readonly Review[]>([]);
  private readonly _canReview = signal(false);
  private readonly _reason = signal<RefusalReason | null>(null);
  private readonly _distribution = signal<Distribution>({ '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 });
  private readonly _rating = signal<Rating>(null);
  private readonly _reviewCount = signal(0);
  private readonly _submitting = signal(false);
  private readonly _submitError = signal<ApiError | null>(null);
  private readonly _pendingReviewId = signal<string | null>(null);

  readonly status = this._status.asReadonly();
  readonly error = this._error.asReadonly();
  readonly pack = this._pack.asReadonly();
  readonly reviews = this._reviews.asReadonly();
  readonly canReview = this._canReview.asReadonly();
  readonly reason = this._reason.asReadonly();
  readonly distribution = this._distribution.asReadonly();
  readonly rating = this._rating.asReadonly();
  readonly reviewCount = this._reviewCount.asReadonly();
  readonly submitting = this._submitting.asReadonly();
  readonly submitError = this._submitError.asReadonly();
  readonly pendingReviewId = this._pendingReviewId.asReadonly();

  /** The review the caller already left, which is what "change it" edits. */
  readonly ownReview = computed(
    () => this._reviews().find((review) => review.author_handle === SELF) ?? null,
  );

  /**
   * Two answers, not the brief's three, and the contract is why.
   *
   * There is no edit endpoint: POST /packs/{id}/reviews answers 409 whenever
   * can_review is false, which includes every pack the caller has already
   * reviewed. So "change the one you left" is not something this API can be
   * asked to do. Rendering an editable form for it would put a Save button on
   * screen that is guaranteed to fail, which is the kind of screen this brief
   * exists to catch.
   *
   * The caller's own review is still shown, attributed, in the list below.
   */
  readonly formMode = computed<'write' | 'refused'>(() =>
    this._canReview() ? 'write' : 'refused',
  );

  load(id: string): void {
    this._status.set('loading');
    this._error.set(null);

    // Permission rides along with the list, so the screen renders once rather
    // than assembling itself in two visible steps.
    forkJoin({ pack: this.api.getPack(id), reviews: this.api.getReviews(id) }).subscribe({
      next: ({ pack, reviews }) => this.accept(pack, reviews),
      error: (cause: unknown) => {
        this._status.set('failed');
        this._error.set(cause as ApiError);
      },
    });
  }

  /**
   * RF-5 and RF-7 together. The guard is the promise about what leaves the
   * browser: a second call while the first is in flight returns without
   * sending anything.
   */
  submit(id: string, review: NewReview): void {
    if (this._submitting()) return;

    const before = this.snapshot();
    this._submitting.set(true);
    this._submitError.set(null);
    this.applyOptimistically(review);

    this.api.createReview(id, review).subscribe({
      next: (created) => {
        this._submitting.set(false);
        // The server is the truth. Its numbers replace the guessed ones, and
        // the distribution keeps the local increment because the contract does
        // not return one.
        this._rating.set(created.rating);
        this._reviewCount.set(created.review_count);
        this._pendingReviewId.set(null);
        this._canReview.set(false);
        this._reason.set('already_reviewed');
      },
      error: (cause: unknown) => {
        this._submitting.set(false);
        this.restore(before);
        this._submitError.set(cause as ApiError);
      },
    });
  }

  dismissSubmitError(): void {
    this._submitError.set(null);
  }

  private accept(pack: PackDetail, reviews: ReviewsResponse): void {
    this._pack.set(pack);
    this._distribution.set(pack.distribution);
    this._reviews.set(reviews.items);
    this._canReview.set(reviews.can_review);
    this._reason.set(reviews.reason ?? null);
    // The reviews route is the fresher of the two for these, and it is the one
    // that also carries permission.
    this._rating.set(reviews.rating);
    this._reviewCount.set(reviews.review_count);
    this._pendingReviewId.set(null);
    this._submitError.set(null);
    this._status.set('ready');
  }

  private snapshot(): Snapshot {
    return {
      rating: this._rating(),
      reviewCount: this._reviewCount(),
      distribution: this._distribution(),
      reviews: this._reviews(),
      canReview: this._canReview(),
      reason: this._reason(),
    };
  }

  private restore(before: Snapshot): void {
    this._rating.set(before.rating);
    this._reviewCount.set(before.reviewCount);
    this._distribution.set(before.distribution);
    this._reviews.set(before.reviews);
    this._canReview.set(before.canReview);
    this._reason.set(before.reason);
    this._pendingReviewId.set(null);
  }

  private applyOptimistically({ score, body }: NewReview): void {
    const previous = this.ownReview();
    const next = this.withScore(this._distribution(), score, previous?.score ?? null);
    const { rating, total } = averageOf(next);

    this._distribution.set(next);
    this._rating.set(rating);
    this._reviewCount.set(total);

    const pendingId = `pending_${Date.now()}`;
    this._pendingReviewId.set(pendingId);
    const pending: Review = {
      id: pendingId,
      author_handle: SELF,
      score,
      body,
      created_at: new Date().toISOString(),
    };
    this._reviews.update((current) => [
      pending,
      ...current.filter((review) => review.id !== previous?.id),
    ]);
    // Deliberately NOT flipping canReview here. The form is only withdrawn once
    // the server has actually taken the review; doing it optimistically would
    // unmount the form while its own request is in flight and destroy the
    // draft, which is precisely what RF-7 forbids. The second-submit guard is
    // submit()'s own early return, not the form disappearing.
  }

  /** Editing moves a vote between buckets; a first review only adds one. */
  private withScore(distribution: Distribution, score: Score, replacing: Score | null): Distribution {
    const next: Record<string, number> = { ...distribution };
    if (replacing !== null) next[String(replacing)] = Math.max(0, next[String(replacing)] - 1);
    next[String(score)] = next[String(score)] + 1;
    return next as unknown as Distribution;
  }
}

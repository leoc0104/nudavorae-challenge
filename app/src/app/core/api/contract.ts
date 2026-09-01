/**
 * The stub's contract, transcribed from the brief. These are wire shapes: they
 * are what the server sends, not what the screens render, and nothing outside
 * the api folder should widen them.
 */

/** One of the four sorts the stub accepts. Anything else is a 400. */
export const SORTS = ['newest', 'price_asc', 'price_desc', 'rating'] as const;
export type Sort = (typeof SORTS)[number];

export function isSort(value: string | null | undefined): value is Sort {
  return value !== null && value !== undefined && (SORTS as readonly string[]).includes(value);
}

/** Absolute counts. All five keys, always present. */
export interface Distribution {
  readonly '1': number;
  readonly '2': number;
  readonly '3': number;
  readonly '4': number;
  readonly '5': number;
}

export type Score = 1 | 2 | 3 | 4 | 5;
export const SCORES: readonly Score[] = [1, 2, 3, 4, 5];

/**
 * A decimal string ("4.8"), or null when nobody has rated the pack. A string
 * rather than a number so no float formatting drifts between answer and screen.
 */
export type Rating = string | null;

export interface PackCard {
  readonly id: string;
  readonly title: string;
  readonly creator_handle: string;
  /** Integer. 1999 is $19.99. No decimal crosses the wire. */
  readonly price_cents: number;
  readonly cover_media_id: string;
  readonly rating: Rating;
  readonly review_count: number;
}

export interface PackDetail extends PackCard {
  readonly description: string;
  readonly distribution: Distribution;
  readonly created_at: string;
}

export interface PackPage {
  readonly items: readonly PackCard[];
  /** Opaque, and invalid the moment q or sort changes. Never parse it. */
  readonly next_cursor: string | null;
}

export interface Review {
  readonly id: string;
  readonly author_handle: string;
  readonly score: Score;
  readonly body: string;
  readonly created_at: string;
}

export type RefusalReason = 'not_purchased' | 'already_reviewed' | 'pack_removed';

/**
 * Permission rides along with the list because the screen needs both to render
 * once.
 */
export interface ReviewsResponse {
  readonly items: readonly Review[];
  readonly can_review: boolean;
  readonly reason?: RefusalReason;
  readonly rating: Rating;
  readonly review_count: number;
}

export interface NewReview {
  readonly score: Score;
  readonly body: string;
}

/** What POST /packs/{id}/reviews returns. Note: no distribution. */
export interface ReviewCreated {
  readonly rating: Rating;
  readonly review_count: number;
}

/** { error: { code, message } } on everything that is not a 2xx. */
export interface ApiErrorBody {
  readonly error: {
    readonly code: string;
    readonly message: string;
  };
}

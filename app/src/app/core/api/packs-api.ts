import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { toApiError } from './api-error';
import { NewReview, PackDetail, PackPage, ReviewCreated, ReviewsResponse, Sort } from './contract';

export interface ListQuery {
  readonly q: string;
  readonly sort: Sort;
  readonly cursor?: string | null;
  readonly limit?: number;
}

/**
 * The contract, and nothing else. No caching, no state, no retries: every
 * method is one request and one answer, so that the cancellation in
 * CatalogueStore and the rollback in the pack screen are visible where they
 * happen rather than hidden in here.
 *
 * The app is served through a proxy onto the stub (see proxy.conf.json), so
 * these paths are same-origin. That keeps the Authorization header on cover
 * fetches from provoking a CORS preflight on every card.
 */
@Injectable({ providedIn: 'root' })
export class PacksApi {
  private readonly http = inject(HttpClient);

  listPacks({ q, sort, cursor, limit }: ListQuery): Observable<PackPage> {
    let params = new HttpParams().set('sort', sort);
    if (q !== '') params = params.set('q', q);
    if (limit !== undefined) params = params.set('limit', limit);
    // Opaque. Passed straight back, never parsed, and dropped the moment q or
    // sort changes — the stub fingerprints it and answers 400 otherwise.
    if (cursor !== undefined && cursor !== null) params = params.set('cursor', cursor);

    return this.http.get<PackPage>('/packs', { params }).pipe(this.mapFailure());
  }

  getPack(id: string): Observable<PackDetail> {
    return this.http.get<PackDetail>(`/packs/${encodeURIComponent(id)}`).pipe(this.mapFailure());
  }

  getReviews(id: string): Observable<ReviewsResponse> {
    return this.http
      .get<ReviewsResponse>(`/packs/${encodeURIComponent(id)}/reviews`)
      .pipe(this.mapFailure());
  }

  /**
   * There is deliberately no idempotency key in the contract: RF-7 is a promise
   * about what leaves the browser, so the guard lives at the form, not here.
   */
  createReview(id: string, review: NewReview): Observable<ReviewCreated> {
    return this.http
      .post<ReviewCreated>(`/packs/${encodeURIComponent(id)}/reviews`, review)
      .pipe(this.mapFailure());
  }

  /**
   * Covers are private: /media/{id} refuses any request without the bearer
   * token, which is why they cannot be an <img src>. Going through HttpClient
   * means the interceptors attach that header and the levers, and unsubscribing
   * cancels the request — see SecureImage for the object URL's lifetime.
   */
  getCover(mediaId: string): Observable<Blob> {
    return this.http
      .get(`/media/${encodeURIComponent(mediaId)}`, { responseType: 'blob' })
      .pipe(this.mapFailure());
  }

  private mapFailure<T>() {
    return (source: Observable<T>): Observable<T> =>
      source.pipe(catchError((cause: unknown) => throwError(() => toApiError(cause))));
  }
}

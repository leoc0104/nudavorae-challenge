import { Directive, computed, effect, inject, input, signal } from '@angular/core';
import { PacksApi } from '../api/packs-api';

export type CoverStatus = 'loading' | 'ready' | 'failed';

/**
 * RF-3. Covers are private: /media/{id} refuses any request without the
 * Authorization header, so <img src> cannot fetch them. This fetches the bytes
 * through HttpClient (which is where the token and the levers are attached) and
 * hands the <img> an object URL instead.
 *
 * The lifetime is the point. Every object URL this directive creates is revoked
 * by the same effect's cleanup, which Angular runs both before the effect
 * re-runs (the id changed) and when the directive is destroyed (the card
 * scrolled out of the list, or the route changed). Unsubscribing also cancels
 * the request in flight, so a fast scroll does not leave a queue of downloads
 * finishing into nothing.
 */
@Directive({
  selector: 'img[nudSecureImage]',
  host: {
    '[attr.src]': 'objectUrl()',
    '[attr.data-cover-status]': 'status()',
    '[attr.aria-busy]': 'isLoading()',
  },
})
export class SecureImage {
  private readonly api = inject(PacksApi);

  readonly mediaId = input.required<string>({ alias: 'nudSecureImage' });

  private readonly url = signal<string | null>(null);
  readonly status = signal<CoverStatus>('loading');

  readonly objectUrl = computed(() => this.url());
  readonly isLoading = computed(() => this.status() === 'loading');

  constructor() {
    effect((onCleanup) => {
      const id = this.mediaId();

      this.status.set('loading');
      this.url.set(null);

      const subscription = this.api.getCover(id).subscribe({
        next: (blob) => {
          this.url.set(URL.createObjectURL(blob));
          this.status.set('ready');
        },
        error: () => this.status.set('failed'),
      });

      onCleanup(() => {
        subscription.unsubscribe();
        const created = this.url();
        if (created !== null) URL.revokeObjectURL(created);
      });
    });
  }
}

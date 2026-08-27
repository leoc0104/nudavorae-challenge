import { LiveAnnouncer } from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NewReview, RefusalReason, Score } from '../../core/api/contract';
import { SecureImage } from '../../core/media/secure-image';
import { MoneyPipe } from '../../ui/money.pipe';
import { RatingDisplay } from '../../ui/rating';
import { PackStore } from './pack-store';
import { ReviewForm } from './review-form';

/** The reason there is nothing to offer, in the screen's own words. */
const REFUSALS: Readonly<Record<RefusalReason, { title: string; body: string }>> = {
  not_purchased: {
    title: 'Only buyers can review this pack',
    body: 'Reviews come from people who bought the pack, so the scores stay worth reading.',
  },
  pack_removed: {
    title: 'This pack has been removed',
    body: 'It is no longer for sale, and its reviews are closed. Existing reviews stay visible.',
  },
  already_reviewed: {
    // Reached when the stub says the caller has reviewed the pack but no review
    // in the list is attributed to them, so there is nothing to prefill and
    // nothing to point at. Claiming otherwise would be a screen telling a small
    // lie. Once they write one in this session it is attributed, and the form
    // above becomes the editable version instead.
    title: 'You have already reviewed this pack',
    body: 'Reviews can only be left once per buyer, so there is nothing to add here.',
  },
};

@Component({
  selector: 'nud-pack-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, SecureImage, MoneyPipe, RatingDisplay, ReviewForm],
  providers: [PackStore],
  templateUrl: './pack-page.html',
  styleUrl: './pack-page.css',
})
export class PackPage {
  private readonly route = inject(ActivatedRoute);
  private readonly announcer = inject(LiveAnnouncer);
  protected readonly store = inject(PackStore);

  private readonly params = toSignal(this.route.paramMap, { requireSync: true });
  protected readonly packId = computed(() => this.params().get('id') ?? '');

  protected readonly refusal = computed(() => {
    const reason = this.store.reason();
    return reason === null ? null : REFUSALS[reason];
  });

  /**
   * Absolute counts turned into bar widths, as a share of all reviews rather
   * than of the biggest bucket. Scaling to the biggest bucket always paints one
   * bar full width, which makes two reviews out of four look unanimous.
   */
  protected readonly bars = computed(() => {
    const distribution = this.store.distribution();
    const counts = [5, 4, 3, 2, 1].map((score) => ({
      score: score as Score,
      count: distribution[String(score) as '1' | '2' | '3' | '4' | '5'],
    }));
    const total = counts.reduce((n, bucket) => n + bucket.count, 0);
    return counts.map((bucket) => ({
      ...bucket,
      percent: total === 0 ? 0 : (bucket.count / total) * 100,
    }));
  });

  private lastAnnounced = '';

  constructor() {
    // untracked for the same reason as the catalogue: the effect's only
    // dependency should be the id in the URL, never anything load() touches.
    effect(() => {
      const id = this.packId();
      if (id !== '') untracked(() => this.store.load(id));
    });

    effect(() => {
      const message = this.announcement();
      if (message === '' || message === this.lastAnnounced) return;
      this.lastAnnounced = message;
      this.announcer.announce(message, 'polite');
    });
  }

  private readonly announcement = computed(() => {
    switch (this.store.status()) {
      case 'idle':
        return '';
      case 'loading':
        return 'Loading pack.';
      case 'failed':
        return `Could not load this pack. ${this.store.error()?.message ?? ''}`.trim();
      case 'ready': {
        const pack = this.store.pack();
        return pack === null ? '' : `${pack.title} loaded.`;
      }
    }
  });

  protected onSend(review: NewReview): void {
    this.store.submit(this.packId(), review);
  }

  protected retry(): void {
    this.store.load(this.packId());
  }
}

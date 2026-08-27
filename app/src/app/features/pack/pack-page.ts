import { LiveAnnouncer } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
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
    title: 'You have already reviewed this pack',
    body: 'Your review is in the list below.',
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

  /** Absolute counts turned into bar widths, largest bucket at full width. */
  protected readonly bars = computed(() => {
    const distribution = this.store.distribution();
    const counts = [5, 4, 3, 2, 1].map((score) => ({
      score: score as Score,
      count: distribution[String(score) as '1' | '2' | '3' | '4' | '5'],
    }));
    const largest = Math.max(...counts.map((bucket) => bucket.count), 1);
    return counts.map((bucket) => ({ ...bucket, percent: (bucket.count / largest) * 100 }));
  });

  private lastAnnounced = '';

  constructor() {
    effect(() => {
      const id = this.packId();
      if (id !== '') this.store.load(id);
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

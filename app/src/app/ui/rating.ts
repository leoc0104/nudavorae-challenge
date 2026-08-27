import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Rating } from '../core/api/contract';

/**
 * A read-only average. Five stars are drawn as one strip of colour clipped to
 * the score, so 4.8 looks like 4.8 rather than being rounded to something the
 * number underneath contradicts.
 *
 * The stars are decoration: assistive technology is given one sentence instead,
 * because five separate star images announce nothing useful.
 */
@Component({
  selector: 'nud-rating',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="rating" [class.rating--large]="large()">
      <span class="stars" aria-hidden="true">
        <span class="stars__track">{{ FILLED }}</span>
        <span class="stars__fill" [style.width.%]="percent()">{{ FILLED }}</span>
      </span>

      @if (rating() !== null) {
        <span class="mono rating__value">{{ rating() }}</span>
        @if (reviewCount() !== null) {
          <span class="rating__count mono">({{ reviewCount() }})</span>
        }
      } @else {
        <span class="rating__none">Not yet rated</span>
      }

      <span class="sr-only">{{ description() }}</span>
    </span>
  `,
  styles: `
    .rating {
      display: inline-flex;
      align-items: center;
      gap: var(--nud-space-2);
      font-size: var(--nud-text-14);
    }
    .rating--large {
      font-size: var(--nud-text-18);
    }
    .stars {
      position: relative;
      display: inline-block;
      letter-spacing: 0.1em;
      line-height: 1;
      white-space: nowrap;
    }
    .stars__track {
      color: var(--rating-track);
    }
    .stars__fill {
      position: absolute;
      inset-block-start: 0;
      inset-inline-start: 0;
      overflow: hidden;
      color: var(--rating-on);
      white-space: nowrap;
    }
    .rating__value {
      font-weight: 600;
      color: var(--text-primary);
    }
    .rating__count,
    .rating__none {
      color: var(--text-secondary);
      font-size: 0.9em;
    }
  `,
})
export class RatingDisplay {
  /** A decimal string, or null when nobody has rated the pack. */
  readonly rating = input.required<Rating>();
  readonly reviewCount = input<number | null>(null);
  readonly large = input(false);

  protected readonly FILLED = '★★★★★';

  protected readonly percent = computed(() => {
    const value = this.rating();
    if (value === null) return 0;
    return (Number(value) / 5) * 100;
  });

  protected readonly description = computed(() => {
    const value = this.rating();
    if (value === null) return 'Not yet rated.';
    const count = this.reviewCount();
    const reviews = count === null ? '' : ` from ${count} ${count === 1 ? 'review' : 'reviews'}`;
    return `Rated ${value} out of 5${reviews}.`;
  });
}

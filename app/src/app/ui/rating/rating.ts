import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Rating } from '../../core/api/contract';

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
  templateUrl: './rating.html',
  styleUrl: './rating.css',
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

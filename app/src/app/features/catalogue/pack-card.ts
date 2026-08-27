import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PackCard } from '../../core/api/contract';
import { SecureImage } from '../../core/media/secure-image';
import { MoneyPipe } from '../../ui/money.pipe';
import { RatingDisplay } from '../../ui/rating';

/**
 * One card in the grid. The whole card is the link to the detail screen, so
 * there is one tab stop per pack rather than several, and the accessible name
 * of that link is the pack title.
 *
 * The cover carries alt="" deliberately: it sits inside the link whose name is
 * already the title, and a second announcement of the same thing is noise.
 */
@Component({
  selector: 'nud-pack-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, SecureImage, MoneyPipe, RatingDisplay],
  template: `
    <a class="card" [routerLink]="['/packs', pack().id]">
      <span class="card__cover">
        <img [nudSecureImage]="pack().cover_media_id" alt="" width="640" height="640" />
      </span>

      <span class="card__body">
        <span class="card__title">{{ pack().title }}</span>
        <span class="card__handle mono">{{ '@' + pack().creator_handle }}</span>

        <span class="card__foot">
          <span class="card__price mono">{{ pack().price_cents | money }}</span>
          <nud-rating [rating]="pack().rating" [reviewCount]="pack().review_count" />
        </span>
      </span>
    </a>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }
    .card {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--surface-raised);
      border: 1px solid var(--border-subtle);
      border-radius: var(--nud-radius-card);
      overflow: hidden;
      text-decoration: none;
      color: inherit;
      box-shadow: var(--shadow-card);
      transition:
        transform var(--nud-duration-fast) var(--nud-ease),
        border-color var(--nud-duration-fast) var(--nud-ease);
    }
    .card:hover {
      transform: translateY(-2px);
      border-color: var(--brand-border);
    }
    .card:focus-visible {
      outline: 2px solid var(--focus-ring);
      outline-offset: 2px;
    }
    .card__cover {
      display: block;
      aspect-ratio: 1 / 1;
      background: var(--skeleton-base);
    }
    .card__cover img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    /* Nothing to show until the bytes arrive behind the Authorization header. */
    .card__cover img[data-cover-status='loading'],
    .card__cover img[data-cover-status='failed'] {
      opacity: 0;
    }
    .card__body {
      display: flex;
      flex-direction: column;
      gap: var(--nud-space-1);
      padding: var(--nud-space-4);
      flex: 1;
    }
    .card__title {
      font-family: var(--nud-font-display);
      font-size: var(--nud-text-16);
      font-weight: 600;
      line-height: 1.3;
    }
    .card__handle {
      font-size: var(--nud-text-12);
      color: var(--text-secondary);
    }
    .card__foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--nud-space-2);
      margin-top: auto;
      padding-top: var(--nud-space-3);
    }
    .card__price {
      font-size: var(--nud-text-18);
      font-weight: 600;
    }
  `,
})
export class PackCardComponent {
  readonly pack = input.required<PackCard>();
}

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PackCard } from '../../../core/api/contract';
import { SecureImage } from '../../../core/media/secure-image';
import { MoneyPipe } from '../../../ui/money.pipe';
import { RatingDisplay } from '../../../ui/rating/rating';

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
  templateUrl: './pack-card.html',
  styleUrl: './pack-card.css',
})
export class PackCardComponent {
  readonly pack = input.required<PackCard>();
}

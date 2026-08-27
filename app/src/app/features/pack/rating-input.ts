import { ChangeDetectionStrategy, Component, computed, input, model, signal } from '@angular/core';
import { SCORES, Score } from '../../core/api/contract';

let nextGroupId = 0;

/**
 * RF-4. Five native radios in a fieldset.
 *
 * Almost everything the rule asks for is what a radio group already is: it is
 * one tab stop, the arrow keys move between the options, the browser draws a
 * real focus ring, and assistive technology reports one control with a value
 * out of five rather than five unrelated images. The brief says a group of five
 * radios is a correct answer and often the best one, and building a div with
 * key handlers instead would be reimplementing this worse.
 *
 * The inputs are visually hidden rather than removed: they still receive focus,
 * still respond to arrow keys, and the label they own is what gets painted. The
 * fill follows the pointer on hover but never lets hover overwrite the chosen
 * value once the pointer leaves.
 *
 * Each label is its own sentence ("3 stars"), because five identical "star"
 * labels tell a screen reader user nothing about which one they are on.
 */
@Component({
  selector: 'nud-rating-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset class="group" [disabled]="disabled()">
      <legend class="legend">{{ label() }}</legend>

      <div class="stars" (mouseleave)="hovered.set(null)">
        @for (score of scores; track score) {
          <input
            class="star__input sr-only"
            type="radio"
            [id]="groupId + '-' + score"
            [name]="groupId"
            [value]="score"
            [checked]="value() === score"
            (change)="value.set(score)"
          />
          <label
            class="star"
            [class.star--on]="shown() >= score"
            [for]="groupId + '-' + score"
            (mouseenter)="hovered.set(score)"
          >
            <span class="star__glyph" aria-hidden="true">&#9733;</span>
            <span class="sr-only">{{ score }} {{ score === 1 ? 'star' : 'stars' }}</span>
          </label>
        }
      </div>
    </fieldset>
  `,
  styles: `
    .group {
      border: 0;
      margin: 0;
      padding: 0;
      min-inline-size: 0;
    }
    .legend {
      padding: 0;
      font-size: var(--nud-text-12);
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .stars {
      display: flex;
      gap: var(--nud-space-1);
      margin-top: var(--nud-space-1);
    }
    .star {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      /* 44px minimum target. */
      min-inline-size: var(--nud-target-min);
      min-block-size: var(--nud-target-min);
      border-radius: var(--nud-radius-control);
      cursor: pointer;
      color: var(--rating-off);
      transition: color var(--nud-duration-fast) var(--nud-ease);
    }
    .star--on {
      color: var(--rating-on);
    }
    .star__glyph {
      font-size: var(--nud-text-30);
      line-height: 1;
    }
    /* The hidden input still owns focus, so the ring is drawn on its label. */
    .star__input:focus-visible + .star {
      outline: 2px solid var(--focus-ring);
      outline-offset: 2px;
    }
    .group:disabled .star {
      cursor: not-allowed;
      opacity: 0.55;
    }
  `,
})
export class RatingInput {
  /** Null on a first review, prefilled when the caller is changing one. */
  readonly value = model<Score | null>(null);
  readonly label = input('Your rating');
  readonly disabled = input(false);

  protected readonly scores = SCORES;
  protected readonly groupId = `rating-${nextGroupId++}`;
  protected readonly hovered = signal<Score | null>(null);

  /** Hover previews, but only while the pointer is actually over the row. */
  protected readonly shown = computed(() => this.hovered() ?? this.value() ?? 0);
}

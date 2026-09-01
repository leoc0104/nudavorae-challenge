import { ChangeDetectionStrategy, Component, computed, input, model, signal } from '@angular/core';
import { SCORES, Score } from '../../../core/api/contract';

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
  templateUrl: './rating-input.html',
  styleUrl: './rating-input.css',
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

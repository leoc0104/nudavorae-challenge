import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { ApiError } from '../../../core/api/api-error';
import { NewReview, Review, Score } from '../../../core/api/contract';
import { RatingInput } from '../rating-input/rating-input';

/**
 * RF-7. Two promises, and they pull in opposite directions.
 *
 * "Cannot be sent twice" is not enforced here by disabling the button. A
 * disabled attribute is applied on the next render, which is a frame too late
 * for a real double-click, so it is presentation only. The guard that counts is
 * in PackStore.submit, which returns without sending while a request is in
 * flight. One choke point, not two half-measures.
 *
 * "Cannot lose what was typed" is why this component owns the draft and never
 * clears it on failure. The fields are seeded once from whatever the caller
 * already wrote and are otherwise the user's alone.
 */
@Component({
  selector: 'nud-review-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RatingInput],
  templateUrl: './review-form.html',
  styleUrl: './review-form.css',
})
export class ReviewForm {
  readonly mode = input.required<'write' | 'edit'>();
  /** The review being changed, when there is one. */
  readonly existing = input<Review | null>(null);
  readonly submitting = input(false);
  /** The server's reason, shown verbatim so the screen says what happened. */
  readonly failure = input<ApiError | null>(null);

  readonly send = output<NewReview>();

  protected readonly score = signal<Score | null>(null);
  protected readonly body = signal('');
  private readonly localProblem = signal<string | null>(null);
  private seeded = false;

  /** The form's own complaint, or the server's, whichever is current. */
  protected readonly problem = computed(() => this.localProblem() ?? this.failure()?.message ?? null);

  constructor() {
    // Prefilled when changing a review, empty when writing the first one. Seeded
    // once: after that the fields belong to the user, and a re-render must never
    // overwrite what they are in the middle of typing.
    effect(() => {
      const existing = this.existing();
      untracked(() => {
        if (this.seeded || existing === null) return;
        this.seeded = true;
        this.score.set(existing.score);
        this.body.set(existing.body);
      });
    });
  }

  protected onBodyInput(event: Event): void {
    this.body.set((event.target as HTMLTextAreaElement).value);
    this.localProblem.set(null);
  }

  protected onSubmit(event: Event): void {
    // The native submit, prevented explicitly. Using (ngSubmit) without
    // importing FormsModule binds nothing at all: the browser then submits the
    // form for real, the app reloads, and the draft is gone. Nothing here needs
    // NgForm, so the platform event is the honest thing to listen to.
    event.preventDefault();

    const score = this.score();
    const body = this.body().trim();

    if (score === null) {
      this.localProblem.set('Choose a rating from one to five stars.');
      return;
    }
    if (body === '') {
      this.localProblem.set('A review needs some text.');
      return;
    }

    this.localProblem.set(null);
    // Emitting twice is harmless: the store is where the second one stops.
    this.send.emit({ score, body });
  }
}

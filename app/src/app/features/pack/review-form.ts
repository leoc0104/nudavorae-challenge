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
import { ApiError } from '../../core/api/api-error';
import { NewReview, Review, Score } from '../../core/api/contract';
import { RatingInput } from './rating-input';

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
  template: `
    <form class="form" (submit)="onSubmit($event)">
      <h3 class="form__title">{{ mode() === 'edit' ? 'Change your review' : 'Write a review' }}</h3>

      <nud-rating-input [(value)]="score" [disabled]="submitting()" />

      <div class="form__field">
        <label class="form__label" for="review-body">Your review</label>
        <textarea
          id="review-body"
          class="form__input"
          rows="4"
          [value]="body()"
          (input)="onBodyInput($event)"
          [attr.aria-describedby]="problem() !== null ? 'review-problem' : null"
          [attr.aria-invalid]="problem() !== null"
        ></textarea>
      </div>

      @if (problem(); as message) {
        <p class="form__problem" id="review-problem" role="alert">{{ message }}</p>
      }

      <div class="form__actions">
        <button class="button button--primary" type="submit" [disabled]="submitting()">
          {{ submitting() ? 'Sending...' : mode() === 'edit' ? 'Save changes' : 'Post review' }}
        </button>
        @if (submitting()) {
          <span class="form__status" aria-live="polite">Sending your review...</span>
        }
      </div>
    </form>
  `,
  styles: `
    .form {
      display: flex;
      flex-direction: column;
      gap: var(--nud-space-4);
      padding: var(--nud-space-6);
      background: var(--surface-raised);
      border: 1px solid var(--border-subtle);
      border-radius: var(--nud-radius-sheet);
    }
    .form__title {
      font-size: var(--nud-text-20);
    }
    .form__field {
      display: flex;
      flex-direction: column;
      gap: var(--nud-space-1);
    }
    .form__label {
      font-size: var(--nud-text-12);
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .form__input {
      padding: var(--nud-space-3);
      background: var(--surface-base);
      color: var(--text-primary);
      border: 1px solid var(--border-strong);
      border-radius: var(--nud-radius-control);
      resize: vertical;
    }
    .form__problem {
      color: var(--status-danger);
      font-size: var(--nud-text-14);
    }
    .form__actions {
      display: flex;
      align-items: center;
      gap: var(--nud-space-3);
    }
    .form__status {
      font-size: var(--nud-text-14);
      color: var(--text-secondary);
    }
  `,
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

import {
  ChangeDetectionStrategy,
  Component,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { Score } from '../../../core/api/contract';
import { RatingInput } from './rating-input';

/**
 * RF-4, the third test: "welcome and not required".
 *
 *   "Reachable by tab, settable without a pointer... understood by a screen
 *    reader as one control carrying a value out of five."
 *
 * What is worth pinning is the structure the keyboard path depends on. The
 * arrow-key navigation and the focus ring belong to the radio group itself, and
 * asserting them in jsdom would be asserting jsdom. What this component is
 * responsible for is that it really is ONE radio group of five sharing a name
 * (which is what makes the arrows work at all), that each option says which one
 * it is, and that choosing without a pointer reports the score.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RatingInput],
  template: `<nud-rating-input [(value)]="score" />`,
})
class Host {
  readonly score = signal<Score | null>(null);
}

describe('RF-4: the rating is operable by keyboard alone', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;

  const radios = (): HTMLInputElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('input[type="radio"]'));

  /** What a screen reader announces: the decorative glyph is aria-hidden. */
  const spokenLabel = (input: HTMLInputElement): string => {
    const label = fixture.nativeElement.querySelector(`label[for="${input.id}"]`) as HTMLElement;
    const spoken = label.cloneNode(true) as HTMLElement;
    for (const hidden of Array.from(spoken.querySelectorAll('[aria-hidden="true"]'))) {
      hidden.remove();
    }
    return spoken.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('is one named radio group of five, distinctly labelled, settable without a pointer', async () => {
    const inputs = radios();
    expect(inputs).toHaveLength(5);

    // A single shared name is what makes the browser treat these as one control
    // carrying a value out of five, and what makes the arrow keys work.
    expect(new Set(inputs.map((input) => input.name)).size).toBe(1);
    expect(fixture.nativeElement.querySelector('fieldset legend')).not.toBeNull();

    // Five identical "star" labels would tell a screen reader user nothing
    // about which option they are on.
    expect(inputs.map(spokenLabel)).toEqual(['1 star', '2 stars', '3 stars', '4 stars', '5 stars']);

    // It opens with nothing selected on a first review.
    expect(inputs.some((input) => input.checked)).toBe(false);

    // Choosing without a pointer reports the score to the caller.
    const third = inputs[2];
    third.checked = true;
    third.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(host.score()).toBe(3);
  });
});

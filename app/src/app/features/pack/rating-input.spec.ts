import {
  ChangeDetectionStrategy,
  Component,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { Score } from '../../core/api/contract';
import { RatingInput } from './rating-input';

/**
 * RF-4, the optional third test.
 *
 * What is worth pinning here is the structure the rule depends on, not the
 * browser's own behaviour: arrow-key navigation and the focus ring belong to
 * the radio group and testing them in jsdom would be testing jsdom. What this
 * component is responsible for is that it really is one radio group, that each
 * option says which one it is, and that it opens empty or prefilled as asked.
 */
@Component({
  // OnPush here too, so the control is exercised the way it is used.
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RatingInput],
  template: `<nud-rating-input [(value)]="score" />`,
})
class Host {
  readonly score = signal<Score | null>(null);
}

describe('RatingInput (RF-4)', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;

  const radios = (): HTMLInputElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('input[type="radio"]'));

  /**
   * What assistive technology would announce for the option: the decorative
   * glyph is aria-hidden, so it is not part of the accessible name.
   */
  const labelFor = (input: HTMLInputElement): string => {
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

  it('is one radio group of five, not five unrelated controls', () => {
    const inputs = radios();
    expect(inputs).toHaveLength(5);

    // A single shared name is what makes the browser treat these as one control
    // with a value out of five, and what makes the arrow keys work.
    const names = new Set(inputs.map((input) => input.name));
    expect(names.size).toBe(1);

    // And they sit in a fieldset with a legend, so the group has a name.
    expect(fixture.nativeElement.querySelector('fieldset legend')).not.toBeNull();
  });

  it('gives every option its own label rather than five identical stars', () => {
    const labels = radios().map(labelFor);
    expect(labels).toEqual(['1 star', '2 stars', '3 stars', '4 stars', '5 stars']);
    expect(new Set(labels).size).toBe(5);
  });

  it('opens with nothing selected on a first review', () => {
    expect(radios().some((input) => input.checked)).toBe(false);
  });

  it('opens prefilled when the caller is changing a review', async () => {
    host.score.set(4);
    await fixture.whenStable();

    const checked = radios().filter((input) => input.checked);
    expect(checked).toHaveLength(1);
    expect(checked[0].value).toBe('4');
  });

  it('reports the score when an option is chosen without a pointer', async () => {
    const three = radios()[2];
    three.checked = true;
    three.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(host.score()).toBe(3);
  });
});

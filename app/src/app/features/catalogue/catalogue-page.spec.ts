import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CataloguePage } from './catalogue-page';

/**
 * A regression test for a bug that a store-level test cannot see.
 *
 * The page drives the store from an effect. CatalogueStore.load() reads the
 * store's own status to decide whether a failed query is worth retrying, and a
 * signal read inside an effect becomes a dependency of that effect. Tracked,
 * that closes a loop: the request fails, status becomes 'failed', the effect
 * re-runs, load() sees 'failed' and requests again, for ever. The screen sits
 * on its loading state hammering the server and the failure is never drawn,
 * which is precisely the kind of screen this brief is about.
 *
 * The fix is untracked() around the call. This pins it.
 */
describe('CataloguePage', () => {
  let fixture: ComponentFixture<CataloguePage>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    fixture = TestBed.createComponent(CataloguePage);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify({ ignoreCancelled: true }));

  it('asks once, and stops asking, when the request fails', async () => {
    await fixture.whenStable();

    const first = http.match((request) => request.url === '/packs');
    expect(first).toHaveLength(1);

    first[0].flush(
      { error: { code: 'forced_failure', message: 'The stub was asked for a 500.' } },
      { status: 500, statusText: 'Server Error' },
    );
    await fixture.whenStable();

    // The failure must not feed back into the effect that asked for it.
    expect(http.match((request) => request.url === '/packs')).toHaveLength(0);

    // And the failure is actually on screen, rather than a spinner for ever.
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('The stub was asked for a 500.');
    expect(fixture.nativeElement.querySelector('.state--error')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.skeleton')).toBeNull();
  });
});

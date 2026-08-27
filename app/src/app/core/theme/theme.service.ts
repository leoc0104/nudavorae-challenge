import { DOCUMENT, Injectable, computed, effect, inject, signal } from '@angular/core';

export type ThemeChoice = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'nud.theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

function isChoice(value: string | null): value is ThemeChoice {
  return value === 'system' || value === 'light' || value === 'dark';
}

/**
 * RF-9: light and dark both real, the theme survives a reload, and it follows
 * the operating system until the user overrides it.
 *
 * Three states rather than two is what makes that last clause literally true:
 * 'system' is a stored value in its own right, so a user who has chosen it
 * keeps tracking the OS across reloads, and only an explicit light/dark pins
 * the page. Nothing is written to storage until the user actually chooses.
 *
 * The resolved theme is stamped on <html data-theme>, so semantic.css needs
 * exactly two blocks and never has to repeat itself inside a media query.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly media = this.document.defaultView?.matchMedia(DARK_QUERY) ?? null;

  private readonly systemPrefersDark = signal(this.media?.matches ?? false);

  readonly choice = signal<ThemeChoice>(this.readStoredChoice());

  readonly resolved = computed<ResolvedTheme>(() => {
    const choice = this.choice();
    if (choice !== 'system') return choice;
    return this.systemPrefersDark() ? 'dark' : 'light';
  });

  constructor() {
    // Kept for the lifetime of the root injector, and torn down with it.
    const listener = (event: MediaQueryListEvent): void => this.systemPrefersDark.set(event.matches);
    this.media?.addEventListener('change', listener);

    effect(() => {
      this.document.documentElement.dataset['theme'] = this.resolved();
    });
  }

  select(choice: ThemeChoice): void {
    this.choice.set(choice);
    try {
      this.document.defaultView?.localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      // Private browsing or a blocked store: the page still themes correctly,
      // it just will not remember. Not worth failing over.
    }
  }

  private readStoredChoice(): ThemeChoice {
    try {
      const stored = this.document.defaultView?.localStorage.getItem(STORAGE_KEY) ?? null;
      return isChoice(stored) ? stored : 'system';
    } catch {
      return 'system';
    }
  }
}

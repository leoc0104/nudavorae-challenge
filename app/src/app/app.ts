import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { ThemeChoice, ThemeService } from './core/theme/theme.service';

const THEME_OPTIONS: readonly { value: ThemeChoice; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

@Component({
  selector: 'nud-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink],
  template: `
    <a class="skip" href="#main">Skip to content</a>

    <header class="masthead">
      <div class="masthead__inner">
        <a class="brand" routerLink="/">
          <span class="brand__mark" aria-hidden="true"></span>
          <span class="brand__name">nudavorae</span>
        </a>

        <fieldset class="theme">
          <legend class="sr-only">Colour theme</legend>
          @for (option of themeOptions; track option.value) {
            <input
              class="theme__input sr-only"
              type="radio"
              name="theme"
              [id]="'theme-' + option.value"
              [value]="option.value"
              [checked]="theme.choice() === option.value"
              (change)="theme.select(option.value)"
            />
            <label class="theme__option" [for]="'theme-' + option.value">{{ option.label }}</label>
          }
        </fieldset>
      </div>
    </header>

    <main id="main" tabindex="-1">
      <router-outlet />
    </main>
  `,
  styles: `
    .skip {
      position: absolute;
      inset-inline-start: var(--nud-space-4);
      inset-block-start: calc(var(--nud-space-4) * -4);
      z-index: 10;
      padding: var(--nud-space-2) var(--nud-space-4);
      background: var(--surface-overlay);
      border: 1px solid var(--border-strong);
      border-radius: var(--nud-radius-control);
      transition: inset-block-start var(--nud-duration-fast) var(--nud-ease);
    }
    .skip:focus {
      inset-block-start: var(--nud-space-4);
    }

    .masthead {
      border-bottom: 1px solid var(--border-subtle);
      background: var(--surface-base);
      position: sticky;
      top: 0;
      z-index: 5;
    }
    .masthead__inner {
      max-width: var(--nud-page-max);
      margin: 0 auto;
      padding: var(--nud-space-3) var(--nud-space-6);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--nud-space-4);
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: var(--nud-space-2);
      text-decoration: none;
      color: var(--text-primary);
      min-height: var(--nud-target-min);
    }
    .brand__mark {
      width: 20px;
      height: 20px;
      border-radius: var(--nud-radius-full);
      background: var(--brand-gradient);
    }
    .brand__name {
      font-family: var(--nud-font-display);
      font-weight: 600;
      font-size: var(--nud-text-18);
      letter-spacing: -0.02em;
    }

    .theme {
      display: flex;
      border: 1px solid var(--border-strong);
      border-radius: var(--nud-radius-full);
      padding: 2px;
      margin: 0;
      gap: 2px;
    }
    .theme__option {
      display: inline-flex;
      align-items: center;
      padding: 0 var(--nud-space-3);
      min-height: calc(var(--nud-target-min) - 12px);
      border-radius: var(--nud-radius-full);
      font-size: var(--nud-text-12);
      font-weight: 600;
      color: var(--text-secondary);
      cursor: pointer;
      transition: background-color var(--nud-duration-fast) var(--nud-ease);
    }
    .theme__option:hover {
      color: var(--text-primary);
    }
    .theme__input:checked + .theme__option {
      background: var(--brand-tint);
      color: var(--text-link);
    }
    .theme__input:focus-visible + .theme__option {
      outline: 2px solid var(--focus-ring);
      outline-offset: 2px;
    }

    main:focus {
      outline: none;
    }
  `,
})
export class App {
  protected readonly theme = inject(ThemeService);
  protected readonly themeOptions = THEME_OPTIONS;
}

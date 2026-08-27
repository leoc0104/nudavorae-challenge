import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { authInterceptor, leverInterceptor } from './core/http/api.interceptors';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      // The catalogue restores its own scroll position from the store (RF-6),
      // and the pack screen is a fresh page, so anchors are all the router is
      // asked to handle here.
      withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'disabled' }),
    ),
    provideHttpClient(withInterceptors([authInterceptor, leverInterceptor])),
  ],
};

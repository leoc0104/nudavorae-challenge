import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { LeverSource } from './levers';

/**
 * "Every request carries Authorization: Bearer nud_demo_7f3c. That literal
 * string is the whole of authentication." The brief asks for exactly this and
 * explicitly does not want an auth flow built around it.
 */
const TOKEN = 'nud_demo_7f3c';

export const authInterceptor: HttpInterceptorFn = (req, next) =>
  next(req.clone({ setHeaders: { Authorization: `Bearer ${TOKEN}` } }));

/** Copies whichever levers are on the page URL onto the outgoing request. */
export const leverInterceptor: HttpInterceptorFn = (req, next) => {
  const levers = inject(LeverSource).current();
  const entries = Object.entries(levers);
  if (entries.length === 0) return next(req);

  let params = req.params;
  for (const [key, value] of entries) params = params.set(key, value);
  return next(req.clone({ params }));
};

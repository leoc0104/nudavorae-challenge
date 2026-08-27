import { DOCUMENT, Injectable, inject } from '@angular/core';

/**
 * The stub's three levers: ?delay=<ms>, ?fail=<status> and ?empty=1.
 *
 * They are read from the PAGE url and copied onto every request the app makes
 * while they are there, because the requests that matter are ones a reviewer
 * cannot address directly: ?delay=3000 has to slow the search *this app* fires.
 *
 * They are deliberately not application state. Nothing stores them, nothing
 * persists them, no signal owns them, and changing one never pushes a history
 * entry. Reading location at request time is what keeps that true.
 */
export const LEVER_KEYS = ['delay', 'fail', 'empty'] as const;
export type LeverKey = (typeof LEVER_KEYS)[number];

export type Levers = Partial<Record<LeverKey, string>>;

/** Pure so the interceptor's behaviour is testable without a browser. */
export function parseLevers(search: string): Levers {
  const params = new URLSearchParams(search);
  const levers: Record<string, string> = {};
  for (const key of LEVER_KEYS) {
    const value = params.get(key);
    if (value !== null && value !== '') levers[key] = value;
  }
  return levers;
}

@Injectable({ providedIn: 'root' })
export class LeverSource {
  private readonly document = inject(DOCUMENT);

  /** Read at call time, never cached: the reviewer may edit the URL mid-session. */
  current(): Levers {
    return parseLevers(this.document.defaultView?.location.search ?? '');
  }
}

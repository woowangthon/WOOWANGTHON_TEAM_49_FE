
import { translate } from "@/i18n/translate";
export interface SessionSnapshot {
  readonly accessToken: string | null;
  readonly generation: number;
  readonly signal: AbortSignal;
}

/** One instance per application tree; never shared across server requests. */
export function createMemorySession() {
  let controller = new AbortController();
  let snapshot: SessionSnapshot = {
    accessToken: null,
    generation: 0,
    signal: controller.signal,
  };
  const listeners = new Set<() => void>();

  function replace(accessToken: string | null) {
    controller.abort();
    controller = new AbortController();
    snapshot = {
      accessToken,
      generation: snapshot.generation + 1,
      signal: controller.signal,
    };
    listeners.forEach((listener) => listener());
  }

  return {
    getSnapshot: () => snapshot,
    /** Call after successful login/account switch, even if the token happens to match. */
    start(accessToken: string) {
      if (!accessToken.trim()) throw new Error(translate("auth.session_use_count_empty"));
      replace(accessToken);
    },
    clear: () => replace(null),
    /** Refresh rotates credentials without changing the authenticated user's cache scope. */
    rotate(accessToken: string, generation: number): boolean {
      if (snapshot.generation !== generation || !accessToken.trim()) return false;
      snapshot = { ...snapshot, accessToken };
      return true;
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}

export type MemorySession = ReturnType<typeof createMemorySession>;

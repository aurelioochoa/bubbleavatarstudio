// Persistence: localStorage autosave with ≤300ms debounce (FR-9).
export const STORAGE_KEY = "bubble-studio.document.v1";

export function loadDocument(): unknown {
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

/**
 * Writes the document, reporting whether it landed (FR-9.6).
 *
 * A full or blocked store must not take the app down — the export is still
 * there and the work is not lost until the tab closes — but it must not be
 * indistinguishable from a successful save either, which is what the boolean
 * is for and what the header says.
 */
export function saveDocument(doc: unknown): boolean {
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
    return true;
  } catch {
    return false;
  }
}

export interface Autosaver {
  push(doc: unknown): void;
  flush(): void;
  cancel(): void;
}

export function createAutosaver(
  delayMs = 300,
  /** Called with the outcome of each write that actually happens (FR-9.6). */
  onSaved?: (ok: boolean) => void,
): Autosaver {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: unknown = null;
  const flush = () => {
    timer = null;
    // Nothing pending is not a save: a pagehide on an untouched document must
    // not announce one.
    if (pending !== null) {
      const ok = saveDocument(pending);
      pending = null;
      onSaved?.(ok);
      return;
    }
    pending = null;
  };
  return {
    push(doc) {
      pending = doc;
      if (timer === null) timer = setTimeout(flush, delayMs);
    },
    flush,
    cancel() {
      if (timer !== null) clearTimeout(timer);
      timer = null;
      pending = null;
    },
  };
}

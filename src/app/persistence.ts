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

export function saveDocument(doc: unknown): void {
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
  } catch {
    // Storage full/blocked — autosave silently skips; export remains available.
  }
}

export interface Autosaver {
  push(doc: unknown): void;
  flush(): void;
  cancel(): void;
}

export function createAutosaver(delayMs = 300): Autosaver {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: unknown = null;
  const flush = () => {
    timer = null;
    if (pending !== null) saveDocument(pending);
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

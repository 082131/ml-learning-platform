import { migrate } from './migrate';
import { BACKUP_KEY, emptyState, STORAGE_KEY, type ProgressState } from './schema';

export const WRITE_DEBOUNCE_MS = 300;
const PROBE_KEY = 'mlp:probe';

/** Why progress may not be saved. `null` means storage works. */
export type StorageNotice = 'unavailable' | 'reset' | 'write-failed' | null;

export interface ProgressStore {
  getState(): ProgressState;
  getNotice(): StorageNotice;
  subscribe(listener: () => void): () => void;
  update(fn: (s: ProgressState) => ProgressState): void;
  flush(): void;
  dismissNotice(): void;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function probe(storage: StorageLike | null): boolean {
  if (!storage) return false;
  try {
    storage.setItem(PROBE_KEY, '1');
    storage.removeItem(PROBE_KEY);
    return true;
  } catch {
    return false;
  }
}

function load(storage: StorageLike): { state: ProgressState; corrupt: boolean } {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) return { state: emptyState(), corrupt: false };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = undefined;
  }
  const state = migrate(parsed);
  if (state) return { state, corrupt: false };
  storage.setItem(BACKUP_KEY, raw);
  return { state: emptyState(), corrupt: true };
}

export function createProgressStore(
  storage: StorageLike | null,
  debounceMs: number = WRITE_DEBOUNCE_MS,
): ProgressStore {
  const available = probe(storage);
  let state = emptyState();
  let notice: StorageNotice = available ? null : 'unavailable';
  if (available && storage) {
    try {
      const loaded = load(storage);
      state = loaded.state;
      if (loaded.corrupt) notice = 'reset';
    } catch {
      notice = 'unavailable';
    }
  }

  const listeners = new Set<() => void>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let dirty = false;
  const emit = () => listeners.forEach((l) => l());

  function write() {
    timer = undefined;
    if (!dirty || !storage || notice === 'unavailable') return;
    dirty = false;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      notice = 'write-failed';
      emit();
    }
  }

  return {
    getState: () => state,
    getNotice: () => notice,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update(fn) {
      const next = fn(state);
      if (next === state) return;
      state = next;
      dirty = true;
      if (timer === undefined) timer = setTimeout(write, debounceMs);
      emit();
    },
    flush() {
      if (timer !== undefined) clearTimeout(timer);
      write();
    },
    dismissNotice() {
      if (notice === 'reset') {
        notice = null;
        emit();
      }
    },
  };
}

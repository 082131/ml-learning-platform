import { useSyncExternalStore } from 'react';
import { appExamStore } from '@/components/exam/useExamStore';
import { parseExamState } from '@/lib/exam/storage';
import { migrate } from '@/lib/progress/migrate';
import { createSync, type BaseStorage, type RemoteDoc, type Sync, type SyncStatus } from '@/lib/sync/engine';
import { mergeExams, mergeProgress } from '@/lib/sync/merge';
import { appProgressStore } from './progress';

// Cross-device sync. When the site is opened as a Claude artifact, the viewer gets a private
// document store that follows their Claude sign-in. Anywhere else this stays off and progress
// lives in the browser only.

interface ClaudeRuntime {
  use(name: 'db'): Promise<{ doc(path: string): RemoteDoc } | null>;
  use(name: 'user'): Promise<{ id(): Promise<string | null> } | null>;
}

const BASE_KEY = 'mlp:sync:v1';

/** The last cloud copy this browser merged, kept per signed-in person. */
function browserBases(uid: string): BaseStorage {
  type Saved = { uid?: string; bases?: Record<string, string> };
  const read = (): Saved => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(BASE_KEY) ?? '{}') as Saved;
      return saved.uid === uid ? saved : {};
    } catch {
      return {};
    }
  };
  return {
    load: (name) => read().bases?.[name] ?? null,
    save(name, json) {
      window.localStorage.setItem(
        BASE_KEY,
        JSON.stringify({ uid, bases: { ...read().bases, [name]: json } }),
      );
    },
  };
}

let status: SyncStatus = { phase: 'connecting' };
const listeners = new Set<() => void>();
function setStatus(next: SyncStatus) {
  status = next;
  listeners.forEach((l) => l());
}

let started = false;

/** Starts sync once. Safe to call anywhere: it turns itself off when the cloud store is not there. */
export async function startSync(): Promise<Sync | null> {
  if (started) return null;
  started = true;
  try {
    const claude = (window as unknown as { claude?: ClaudeRuntime }).claude;
    if (typeof claude?.use !== 'function') throw new Error('not an artifact');
    const [db, user] = await Promise.all([claude.use('db'), claude.use('user')]);
    const uid = await user?.id();
    if (!db || !uid) throw new Error('no private store for this viewer');
    const mine = `data/users/${uid}`;
    const sync = createSync(
      [
        {
          name: 'progress',
          store: appProgressStore,
          doc: db.doc(`${mine}/progress`),
          parse: (json) => migrate(JSON.parse(json)),
          merge: mergeProgress,
        },
        {
          name: 'exams',
          store: appExamStore,
          doc: db.doc(`${mine}/exams`),
          parse: (json) => parseExamState(json),
          merge: mergeExams,
        },
      ],
      { bases: browserBases(uid) },
    );
    setStatus(sync.getStatus());
    sync.subscribe(() => setStatus(sync.getStatus()));
    return sync;
  } catch {
    setStatus({ phase: 'off' });
    return null;
  }
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(subscribe, () => status);
}

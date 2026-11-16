import { canonical } from './merge';

// Keeps a local store and one cloud document in step. The cloud side is passed in, so this runs in tests.

export interface SyncedStore<T> {
  getState(): T;
  subscribe(listener: () => void): () => void;
  update(fn: (s: T) => T): void;
}

export interface RemoteSnapshot {
  exists: boolean;
  data(): Record<string, unknown> | undefined;
  metadata: { fromCache: boolean; hasPendingWrites: boolean };
}

export interface RemoteDoc {
  get(): Promise<RemoteSnapshot>;
  set(data: Record<string, unknown>): Promise<void>;
  onSnapshot(next: (snap: RemoteSnapshot) => void, error?: (e: { code?: string }) => void): () => void;
}

export interface Channel<T> {
  name: string;
  store: SyncedStore<T>;
  doc: RemoteDoc;
  /** Returns null for text that is not a saved state. */
  parse(json: string): T | null;
  merge(base: T | null, local: T, remote: T): T;
}

export type SyncPhase = 'off' | 'connecting' | 'syncing' | 'synced' | 'unreachable' | 'error' | 'read-only';

export interface SyncStatus {
  phase: SyncPhase;
  lastSyncedAt?: number;
}

export interface BaseStorage {
  load(name: string): string | null;
  save(name: string, json: string): void;
}

export interface SyncOptions {
  bases: BaseStorage;
  debounceMs?: number;
  retryMs?: number;
  loadingTimeoutMs?: number;
  now?: () => number;
}

export interface Sync {
  getStatus(): SyncStatus;
  subscribe(listener: () => void): () => void;
  stop(): void;
}

export const PUSH_DEBOUNCE_MS = 800;
const RETRY_MS = 30_000;
const LOADING_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 5;

type ChannelPhase = Exclude<SyncPhase, 'off'>;
// The overall status is the worst channel's.
const SEVERITY: ChannelPhase[] = ['synced', 'syncing', 'connecting', 'unreachable', 'error', 'read-only'];

// Each channel has its own state type; the engine only moves them around.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyChannel = Channel<any>;

export function createSync(channels: AnyChannel[], options: SyncOptions): Sync {
  const debounceMs = options.debounceMs ?? PUSH_DEBOUNCE_MS;
  const retryMs = options.retryMs ?? RETRY_MS;
  const now = options.now ?? Date.now;
  const listeners = new Set<() => void>();
  let lastSyncedAt: number | undefined;
  let status: SyncStatus = { phase: 'connecting' };
  let stopped = false;
  const stoppers: (() => void)[] = [];
  const phases = new Map<string, ChannelPhase>();

  function setPhase(name: string, phase: ChannelPhase) {
    phases.set(name, phase);
    if (phase === 'synced') lastSyncedAt = now();
    const worst = [...phases.values()].reduce((a, b) => (SEVERITY.indexOf(b) > SEVERITY.indexOf(a) ? b : a));
    if (worst === status.phase && lastSyncedAt === status.lastSyncedAt) return;
    status = { phase: worst, lastSyncedAt };
    listeners.forEach((l) => l());
  }

  function run<T>(ch: Channel<T>) {
    const parseOrNull = (json: string | null) => {
      try {
        return json === null ? null : ch.parse(json);
      } catch {
        return null;
      }
    };
    let base: T | null = parseOrNull(options.bases.load(ch.name));
    /** What the cloud holds, as far as this device knows. */
    let remoteJson: string | null = null;
    let seenRemote = false;
    let inFlight = false;
    let again = false;
    let dead = false;
    let retries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const inStep = () => canonical(ch.store.getState()) === remoteJson;

    function setBase(state: T, json: string) {
      base = state;
      remoteJson = json;
      try {
        options.bases.save(ch.name, json);
      } catch {
        // Without a saved base the next visit merges as a first sync, which only ever keeps more.
      }
    }

    function integrate(snap: RemoteSnapshot) {
      seenRemote = true;
      const raw = snap.exists ? snap.data()?.json : undefined;
      const remote = typeof raw === 'string' ? parseOrNull(raw) : null;
      if (remote === null) {
        remoteJson = null;
        return;
      }
      const merged = ch.merge(base, ch.store.getState(), remote);
      setBase(remote, canonical(remote));
      if (canonical(merged) !== canonical(ch.store.getState())) ch.store.update(() => merged);
    }

    function schedule(delay: number) {
      if (dead || stopped) return;
      if (inFlight) {
        again = true;
        return;
      }
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(() => void push(), delay);
      setPhase(ch.name, 'syncing');
    }

    async function push() {
      timer = undefined;
      if (dead || stopped || inFlight) return;
      inFlight = true;
      try {
        // Read just before writing, so a change another device made a moment ago is merged, not overwritten.
        const latest = await ch.doc.get();
        if (!latest.metadata.fromCache) integrate(latest);
        const state = ch.store.getState();
        const json = canonical(state);
        if (json !== remoteJson) {
          await ch.doc.set({ v: 1, json, updatedAt: now() });
          setBase(state, json);
        }
        retries = 0;
        inFlight = false;
        if (again || !inStep()) {
          again = false;
          schedule(debounceMs);
        } else setPhase(ch.name, 'synced');
      } catch (e) {
        inFlight = false;
        again = false;
        if ((e as { code?: string } | null)?.code === 'invalid_argument') {
          // This viewer may not write here. Progress stays in this browser.
          dead = true;
          setPhase(ch.name, 'read-only');
          return;
        }
        setPhase(ch.name, 'error');
        retries += 1;
        if (retries <= MAX_RETRIES && !stopped) timer = setTimeout(() => void push(), retryMs * retries);
      }
    }

    phases.set(ch.name, 'connecting');
    const loading = setTimeout(() => {
      if (!seenRemote) setPhase(ch.name, 'unreachable');
    }, options.loadingTimeoutMs ?? LOADING_TIMEOUT_MS);

    const stopRemote = ch.doc.onSnapshot(
      (snap) => {
        // A cached or unconfirmed copy can be older than what this device already merged.
        if (dead || stopped || snap.metadata.fromCache || snap.metadata.hasPendingWrites) return;
        clearTimeout(loading);
        integrate(snap);
        if (inStep()) {
          if (!inFlight) setPhase(ch.name, 'synced');
        } else schedule(debounceMs);
      },
      () => {
        clearTimeout(loading);
        dead = true;
        setPhase(ch.name, 'error');
      },
    );
    const stopLocal = ch.store.subscribe(() => {
      // Nothing is written until the cloud copy has been read once and merged.
      if (seenRemote && !inStep()) schedule(debounceMs);
    });
    stoppers.push(() => {
      clearTimeout(loading);
      if (timer !== undefined) clearTimeout(timer);
      stopRemote();
      stopLocal();
    });
  }

  channels.forEach((ch) => run(ch));

  return {
    getStatus: () => status,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    stop() {
      stopped = true;
      stoppers.forEach((s) => s());
    },
  };
}

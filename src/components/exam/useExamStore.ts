import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { createExamStore, type ExamStore } from '@/lib/exam/storage';

function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export const appExamStore = createExamStore(browserStorage());

/** Tests wrap the exam page in a provider with their own store. */
export const ExamStoreContext = createContext<ExamStore>(appExamStore);

export function useExamStore() {
  const store = useContext(ExamStoreContext);
  const state = useSyncExternalStore(store.subscribe, store.getState);
  return { state, update: store.update };
}

const TICK_MS = 1000;

/** The current time, refreshed every second while `running` is true. */
export function useNow(running: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [running]);
  return now;
}

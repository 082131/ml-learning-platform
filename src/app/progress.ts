import { createContext, useContext, useSyncExternalStore } from 'react';
import { createProgressStore, type ProgressStore } from '@/lib/progress/store';

function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export const appProgressStore = createProgressStore(browserStorage());

/** Tests wrap components in a provider with their own store. */
export const ProgressContext = createContext<ProgressStore>(appProgressStore);

export function useProgressStore(): ProgressStore {
  return useContext(ProgressContext);
}

export function useProgress() {
  const store = useProgressStore();
  return useSyncExternalStore(store.subscribe, store.getState);
}

export function useStorageNotice() {
  const store = useProgressStore();
  return useSyncExternalStore(store.subscribe, store.getNotice);
}

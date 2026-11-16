import { createContext, useContext, useSyncExternalStore } from 'react';
import { createInterviewStore, type InterviewStore } from '@/lib/interview/storage';

function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export const appInterviewStore = createInterviewStore(browserStorage());

/** Tests wrap the interview pages in a provider with their own store. */
export const InterviewStoreContext = createContext<InterviewStore>(appInterviewStore);

export function useInterviewStore() {
  const store = useContext(InterviewStoreContext);
  const state = useSyncExternalStore(store.subscribe, store.getState);
  return { state, update: store.update };
}

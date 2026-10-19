import { useLayoutEffect, useRef } from 'react';

/** Keeps a ref pointing at the latest value, for use inside long-lived effects. */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}

import { useEffect, type RefObject } from 'react';

const MARK = 'overflowFocus';

/**
 * Makes horizontally scrolling regions keyboard-focusable (WCAG 2.1.1, axe "scrollable-region-focusable"),
 * but only while they actually overflow, so wide screens get no extra tab stops. With a selector, it
 * applies to matching descendants (for example wide formulas in lesson prose); otherwise to the element.
 */
export function useOverflowFocus(ref: RefObject<HTMLElement | null>, selector?: string) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const update = () => {
      const targets = selector ? [...root.querySelectorAll<HTMLElement>(selector)] : [root];
      for (const el of targets) {
        if (el.scrollWidth > el.clientWidth + 1) {
          if (!el.hasAttribute('tabindex')) {
            el.tabIndex = 0;
            el.dataset[MARK] = 'true';
          }
        } else if (el.dataset[MARK]) {
          el.removeAttribute('tabindex');
          delete el.dataset[MARK];
        }
      }
    };
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(root);
    return () => observer.disconnect();
  }, [ref, selector]);
}

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
    // Re-check when the box resizes, and when content changes inside it (for example code that is
    // highlighted after a lazily loaded grammar arrives), which widens it without resizing it.
    const resize = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(update);
    resize?.observe(root);
    const mutation = typeof MutationObserver === 'undefined' ? undefined : new MutationObserver(update);
    mutation?.observe(root, { childList: true, subtree: true, characterData: true });
    return () => {
      resize?.disconnect();
      mutation?.disconnect();
    };
  }, [ref, selector]);
}

import { describe, expect, it } from 'vitest';
import { nextTheme, resolveTheme } from './theme';

describe('theme', () => {
  it('resolves system to the device setting', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });
  it('cycles system → light → dark → system', () => {
    expect([nextTheme('system'), nextTheme('light'), nextTheme('dark')]).toEqual(['light', 'dark', 'system']);
  });
});

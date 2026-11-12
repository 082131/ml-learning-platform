import { expect, test } from '@playwright/test';
import { tracks } from '../../content/curriculum';

const lessonIds = tracks.flatMap((t) => t.chapters.flatMap((c) => c.lessons.map((l) => l.id)));
const routes = [
  '/',
  '/glossary',
  '/bookmarks',
  '/settings',
  '/nowhere',
  ...tracks.map((t) => `/learn/${t.id}`),
  ...lessonIds.map((id) => `/learn/${id}`),
];

test('every curriculum route renders without console errors', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(`${page.url()}: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`${page.url()}: ${e.message}`));
  await page.goto('./');
  for (const route of routes) {
    await page.evaluate((r) => (window.location.hash = r), route);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `horizontal scroll on ${route}`).toBeLessThanOrEqual(0);
  }
  expect(errors).toEqual([]);
  expect(routes.length).toBe(4 + 1 + 7 + 130);
});

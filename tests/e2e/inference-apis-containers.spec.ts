import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const LESSON = './#/learn/inference/serving/apis-containers';

test.beforeEach(async ({ page }) => {
  await page.goto(LESSON);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Model serving, APIs, containers and deployment',
  );
});

test('the canary share changes the cost of the rollback, not the evidence needed', async ({ page }) => {
  const chart = page.locator('[data-canary-n]').first();
  await expect(chart).toHaveAttribute('data-canary-n', '1597');
  await expect(chart).toHaveAttribute('data-canary-extra', '14');

  const controls = page.locator('[data-experiment="canary"]').filter({ has: page.getByRole('slider') });
  const share = controls.getByRole('slider', { name: 'Traffic to the new version (%)' });
  await share.focus();
  await page.keyboard.press('End');
  await expect(chart).toHaveAttribute('data-canary-n', '1597');
  await expect(chart).toHaveAttribute('data-canary-extra', '68');
  await expect(controls.getByRole('region', { name: 'Result' })).toContainText('detected after 0.3 min');

  const rollback = controls.getByRole('slider', { name: 'Minutes to roll back after the alarm' });
  await rollback.focus();
  await page.keyboard.press('Home');
  await expect(chart).toHaveAttribute('data-canary-extra', '8');
});

test('a new version that is not worse has nothing to detect', async ({ page }) => {
  const controls = page.locator('[data-experiment="canary"]').filter({ has: page.getByRole('slider') });
  const canary = controls.getByRole('slider', { name: 'New version error rate (%)' });
  await canary.focus();
  await page.keyboard.press('Home');
  await expect(page.locator('[data-canary-n]').first()).toHaveAttribute('data-canary-n', 'none');
  await expect(controls.getByRole('region', { name: 'Result' })).toContainText('no regression to detect');
});

test('no serious accessibility issues and no horizontal scroll, in both themes', async ({ page }) => {
  await page.locator('[data-code-example="serve-app"] [class*="kw"]').first().waitFor();
  for (const theme of ['light', 'dark']) {
    await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(
      serious.map((v) => `${theme} ${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
    ).toEqual([]);
  }
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
  ).toBeLessThanOrEqual(0);
});

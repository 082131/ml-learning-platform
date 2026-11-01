import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const LESSON = './#/learn/inference/ops/monitoring-load-testing';

test.beforeEach(async ({ page }) => {
  await page.goto(LESSON);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Monitoring, load testing and production debugging',
  );
});

test('a slow burn trips only the slow burn-rate rule; a short spike only the plain threshold', async ({
  page,
}) => {
  const chart = page.locator('[data-slo-fast]').first();
  await expect(chart).toHaveAttribute('data-slo-naive', '1');
  await expect(chart).toHaveAttribute('data-slo-fast', '18');

  const controls = page.locator('[data-experiment="slo"]').filter({ has: page.getByRole('slider') });
  const duration = controls.getByRole('slider', { name: 'Incident length (minutes)' });
  const error = controls.getByRole('slider', { name: 'Error rate during the incident (%)' });

  await duration.fill('600');
  await error.fill('0.8');
  await expect(chart).toHaveAttribute('data-slo-naive', 'never');
  await expect(chart).toHaveAttribute('data-slo-slow', '268');
  await expect(controls.getByRole('region', { name: 'Result' })).toContainText('11.1% of the 30-day budget');

  await duration.fill('2');
  await error.fill('20');
  await expect(chart).toHaveAttribute('data-slo-naive', '1');
  await expect(chart).toHaveAttribute('data-slo-fast', 'never');
});

test('no serious accessibility issues and no horizontal scroll, in both themes', async ({ page }) => {
  await page.locator('[data-code-example="ops-ramp"] [class*="kw"]').first().waitFor();
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

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const LESSON = './#/learn/inference/basics/tensors-graphs';

test.beforeEach(async ({ page }) => {
  await page.goto(LESSON);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Inputs, outputs, tensors');
});

test('changing preprocessing moves the error through the graph, the code and the printout', async ({ page }) => {
  const viz = page.locator('[data-graph-error]').first();
  await expect(viz).toHaveAttribute('data-graph-error', 'none');
  const printout = page.getByRole('region', { name: 'What the code prints' });
  await expect(printout).toContainText('labels  (8,) [7 6 3 7 7 3 2 8]');

  const controls = page.locator('[data-experiment="graph"]').filter({ has: page.getByRole('slider') });
  const prep = controls.getByRole('combobox', { name: 'Preprocessing' });
  await prep.selectOption('image');
  await expect(viz).toHaveAttribute('data-graph-error', 'dense1');
  await expect(printout).toContainText('size 64 is different from 8');
  await expect(page.locator('[data-code-example="graph-numpy"]').first()).toContainText('x = images / 16');

  await prep.selectOption('single');
  await expect(viz).toHaveAttribute('data-graph-error', 'argmax');
  await expect(printout).toContainText('AxisError: axis 1 is out of bounds');

  await prep.selectOption('scale255');
  const batch = controls.getByRole('slider', { name: 'Batch size' });
  await batch.focus();
  await page.keyboard.press('End');
  await expect(viz).toHaveAttribute('data-graph-correct', '229');
  await expect(printout).toContainText('correct 229 of 360');
});

test('no serious accessibility issues and no horizontal scroll, in both themes', async ({ page }) => {
  await page.locator('[data-code-example="graph-numpy"] [class*="kw"]').first().waitFor();
  for (const theme of ['light', 'dark']) {
    await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${theme} ${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual(
      [],
    );
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});

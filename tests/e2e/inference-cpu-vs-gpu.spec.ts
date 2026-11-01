import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const LESSON = './#/learn/inference/hardware/cpu-vs-gpu';

test.beforeEach(async ({ page }) => {
  await page.goto(LESSON);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('CPU vs GPU');
});

test('changing the CPU, width and layers updates the chart, the code and the printout together', async ({ page }) => {
  const viz = page.locator('[data-cpu-ms]').first();
  await expect(viz).toHaveAttribute('data-cpu-ms', '7.509');
  await expect(viz).toHaveAttribute('data-gpu-ms', '2.289');
  const printout = page.getByRole('region', { name: 'What the code prints' });
  await expect(printout).toContainText('CPU     7.509 ms');

  const controls = page.locator('[data-experiment="cpu-gpu"]').filter({ has: page.getByRole('slider') });
  await controls.getByRole('combobox', { name: 'CPU' }).selectOption('server');
  await expect(printout).toContainText('CPU     2.202 ms');
  await expect(page.locator('[data-code-example="cpu-gpu-estimate"]').first()).toContainText('32-core server CPU');

  const width = controls.getByRole('slider', { name: 'Layer width' });
  await width.focus();
  for (let i = 0; i < 30; i++) await page.keyboard.press('ArrowLeft'); // 4096 - 30 · 128 = 256
  const layers = controls.getByRole('slider', { name: 'Layers' });
  await layers.focus();
  for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowLeft'); // 2 layers
  await controls.getByRole('combobox', { name: 'CPU' }).selectOption('laptop');
  await expect(viz).toHaveAttribute('data-crossover', '47');
  await expect(page.locator('[data-code-example="cpu-gpu-estimate"]').first()).toContainText(
    'width, layers, batch = 256, 2, 1',
  );
});

test('no serious accessibility issues and no horizontal scroll, in both themes', async ({ page }) => {
  await page.locator('[data-code-example="cpu-gpu-estimate"] [class*="kw"]').first().waitFor();
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

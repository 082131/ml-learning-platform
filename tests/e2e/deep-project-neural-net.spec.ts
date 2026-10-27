import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const LESSON = './#/learn/ml/deep/project-neural-net';

test.beforeEach(async ({ page }) => {
  await page.goto(LESSON);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('train and evaluate a neural network');
});

test('the brief shows the pinned setup, the recorded starter output, and a checklist that is saved', async ({
  page,
}) => {
  await expect(page.locator('[data-code-example="project-nn-setup"]')).toContainText(
    'pip install numpy==2.5.4 scikit-learn==1.9.1 torch==2.14.1 matplotlib==3.10.8',
  );
  await expect(page.locator('[data-code-example="project-nn-starter"]')).toContainText(
    'train X (341, 30)  benign 214  malignant 127',
  );
  const milestones = page.getByRole('group', { name: /Milestones/ });
  await expect(milestones).toContainText('0 of 8 done');
  await milestones.getByRole('checkbox').first().check();
  await expect(page.getByRole('group', { name: /Milestones · 1 of 8/ })).toBeVisible();
  await page.reload();
  await expect(
    page
      .getByRole('group', { name: /Milestones/ })
      .getByRole('checkbox')
      .first(),
  ).toBeChecked();
  await expect(page.getByRole('table')).toContainText('No leakage');
});

test('the lesson has no serious accessibility issues and no horizontal scroll, in both themes', async ({
  page,
}) => {
  await page.locator('[data-code-example="project-nn-starter"] [class*="kw"]').first().waitFor();
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

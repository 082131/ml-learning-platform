import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { planExercise } from '../../content/tracks/python/project/end-to-end/quiz';
import { servePyodideLocally } from './pyodide';

// Every lesson of the Python for Data & ML track (T.05).
const LESSONS = [
  'core/functions-scope',
  'core/references-mutability',
  'core/iterators-comprehensions',
  'core/classes-dataclasses',
  'core/errors-files-environments',
  'numpy/indexing-views',
  'numpy/dtypes-random',
  'pandas/indexing-dtypes',
  'pandas/groupby-merge-reshape',
  'pandas/time-series',
  'cleaning/missing-duplicates-types',
  'cleaning/text-categories-outliers',
  'analysis/eda-visualization',
  'analysis/statistical-inference',
  'pytorch/tensors-autograd',
  'pytorch/datasets-modules',
  'pytorch/training-loop',
  'project/end-to-end',
];

async function open(page: Page, lesson: string) {
  await page.goto(`./#/learn/python/${lesson}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.locator('[data-code-example] [class*="kw"]').first().waitFor();
}

for (const lesson of LESSONS) {
  test(`${lesson}: no serious accessibility issues or sideways scroll in either theme`, async ({ page }) => {
    await open(page, lesson);
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
}

// Lessons whose explorer is a recorded experiment: the explorer and the linked program share one state.
for (const lesson of LESSONS.filter((l) => !['core/classes-dataclasses', 'project/end-to-end'].includes(l))) {
  test(`${lesson}: choosing another variant updates the linked program's readout`, async ({ page }) => {
    await open(page, lesson);
    const explorer = page.locator('[data-experiment]').first();
    const id = await explorer.getAttribute('data-experiment');
    const readout = page.locator(`[data-experiment="${id}"] [data-readout]`).last();
    const before = await readout.textContent();
    expect(await readout.textContent()).toMatch(/recorded (in CPython 3\.13|with PyTorch 2\.14\.1)/);
    // Some neighbouring variants print the same lines, so try the options in turn until one differs.
    const select = explorer.locator('select').first();
    const values = await select
      .locator('option')
      .evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value));
    let changed = '';
    for (const value of values.slice(1)) {
      await select.selectOption(value);
      await expect(page.locator(`[data-experiment="${id}"] select`).first()).toHaveValue(value);
      if ((await readout.textContent()) !== before) {
        changed = value;
        break;
      }
    }
    expect(changed, 'no variant changed the readout').not.toBe('');
  });
}

test('training loop: the loss curves, cards and printed lines follow the chosen run', async ({ page }) => {
  await open(page, 'pytorch/training-loop');
  const exp = page.locator('[data-experiment="py-torch-train"]').first();
  const curves = exp.getByRole('figure', { name: 'Loss per epoch' });
  await expect(curves).toContainText('Recorded in PyTorch 2.14');
  await expect(curves.locator('[data-series]')).toHaveCount(2);
  await exp.getByLabel('Training settings').selectOption('lr0.1-bs32-nozero');
  await expect(curves).toContainText(
    'zero_grad forgotten. At the last epoch: Train loss 1.3702, Validation loss 1.5991.',
  );
  await expect(exp.locator('[data-card="final val loss"]')).toContainText('lowest was 0.1108 at epoch 3');
  await expect(page.locator('[data-code-example="py-torch-train-code"]')).toContainText(
    'pass  # opt.zero_grad() forgotten',
  );
  await curves.getByRole('button', { name: 'Show table' }).click();
  await expect(curves.getByRole('table')).toContainText('Validation loss');
});

test('project: the brief shows the pinned setup, the starter output and a saved checklist', async ({
  page,
}) => {
  await open(page, 'project/end-to-end');
  await expect(page.locator('[data-code-example="py-project-setup"]')).toContainText(
    'pip install numpy==2.5.3 pandas==3.1.1 matplotlib==3.10.8 torch==2.14.1 pytest==9.2.0',
  );
  await expect(page.locator('[data-code-example="py-project-starter"]')).toContainText(
    "plan labels: ['BASIC ', 'PRO ', 'TEAM ', 'basic', 'pro', 'team']",
  );
  const milestones = page.getByRole('group', { name: /Milestones/ });
  await expect(milestones).toContainText('0 of 7 done');
  await milestones.getByRole('checkbox').first().check();
  await page.reload();
  await expect(page.getByRole('group', { name: /Milestones · 1 of 7/ })).toBeVisible();
});

test.describe('Python in the lesson @network', () => {
  test.describe.configure({ timeout: 150_000 });
  test('the project starter runs in the browser and the exercise solution passes', async ({
    page,
    context,
  }) => {
    await servePyodideLocally(context);
    await open(page, 'project/end-to-end');
    const runner = page.locator('[data-python-runner]').filter({ hasText: 'starter.py' });
    await runner.getByRole('button', { name: 'Run' }).click();
    const printed = runner.getByRole('group', { name: 'Printed output' });
    await expect(printed).toContainText('(2040, 8)', { timeout: 120_000 });
    await expect(printed).toContainText('duplicate rows: 40');

    const exercise = page.locator('#section-exercise');
    await exercise.getByRole('textbox', { name: 'Your solution code editor' }).fill(planExercise.solution);
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise).toContainText('All tests passed.', { timeout: 60_000 });
  });
});

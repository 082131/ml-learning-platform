import { expect, test } from '@playwright/test';
import { histExercise } from '../../content/tracks/ml/foundations/matplotlib-plotting/quiz';
import { expectAccessibleBothThemes, openLesson } from './foundations-helpers';
import { servePyodideLocally } from './pyodide';

test.beforeEach(async ({ page, context }) => {
  await servePyodideLocally(context);
  await openLesson(page, 'ml/foundations/matplotlib-plotting', 'Plotting with Matplotlib');
});

test('the bins slider and column change the bars, the code and the counts', async ({ page }) => {
  const viz = page.locator('[data-viz="Histogram"]');
  await expect(viz.locator('svg[data-bins]')).toHaveAttribute('data-bins', '20');
  await expect(viz.locator('rect[data-count]')).toHaveCount(20);

  await page.getByRole('slider', { name: 'bins' }).fill('3');
  await expect(viz.locator('rect[data-count]')).toHaveCount(3);
  await expect(viz.locator('rect[data-count]').first()).toHaveAttribute('data-count', '144');
  const code = page.locator('[data-code-example="hist-code"]');
  await expect(code).toContainText('ax.hist(values, bins=3)');
  const readout = page.getByRole('region', { name: 'What the code computes' });
  await expect(readout).toContainText('[144 140  58]');
  await expect(readout).toContainText('1200.0');

  await page.getByRole('combobox', { name: 'Column' }).selectOption('flipper_length_mm');
  await expect(code).toContainText('ax.set_xlabel("Flipper length (mm)")');
});

test('the lesson has no serious accessibility issues and no horizontal scroll', async ({ page }) => {
  await page.locator('[data-viz="Histogram"]').waitFor();
  await expectAccessibleBothThemes(page);
});

test.describe('Python in the lesson @network', () => {
  test.describe.configure({ timeout: 180_000 });
  test('Matplotlib draws the figures in the browser and the exercise passes', async ({ page }) => {
    const runner = page.locator('[data-python-runner]').filter({ hasText: 'plots.py' });
    await runner.getByRole('button', { name: 'Run' }).click();
    await expect(runner.getByRole('group', { name: 'Printed output' })).toContainText('2700.0 6300.0 20', {
      timeout: 150_000,
    });
    await expect(runner).not.toContainText('Warning');
    const figures = runner.getByRole('img', { name: /drawn by this code/ });
    await expect(figures).toHaveCount(2);
    for (const fig of await figures.all())
      expect(await fig.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(300);

    const exercise = page.locator('#section-exercise');
    await exercise.getByRole('textbox', { name: 'Your solution code editor' }).fill(histExercise.solution);
    await exercise.getByRole('button', { name: 'Run tests' }).click();
    await expect(exercise).toContainText('All tests passed.', { timeout: 60_000 });
  });
});

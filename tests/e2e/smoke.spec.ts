import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1280) < 900;

async function openNav(page: Page, name: RegExp) {
  if (isPhone(page)) {
    await page.getByRole('button', { name: 'Menu' }).click();
    await page.getByRole('dialog', { name: 'Menu' }).getByRole('link', { name }).click();
  } else {
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name }).click();
  }
}

async function expectNoSeriousA11yIssues(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
});

test('visits every track from the navigation', async ({ page }) => {
  for (const [chip, title] of [
    [/^(ML|Machine Learning Engineer)$/, 'Machine Learning Engineer'],
    [/^(Data|Data Engineering)$/, 'Data Engineering'],
    [/^(AI|AI Engineer)$/, 'AI Engineer'],
    [/^(Inference|Inference Engineer)$/, 'Inference Engineer'],
    [/^(Python|Python for Data & ML)$/, 'Python for Data & ML'],
    [/^(DataOps|ML Data Operations)$/, 'ML Data Operations'],
    [/^(Deploy|Model Deployment and Optimization)$/, 'Model Deployment and Optimization'],
  ] as const) {
    await openNav(page, chip);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(title);
    await expect(page.getByRole('region', { name: `${title} lesson map` })).toBeVisible();
    await expectNoHorizontalScroll(page);
  }
});

test('opens a lesson, follows a prerequisite, marks complete and keeps it after reload', async ({ page }) => {
  await page.goto('./#/learn/ml/foundations/types-of-ml');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Supervised, unsupervised');
  await page
    .getByRole('region', { name: 'Prerequisites' })
    .getByRole('link', { name: /What AI, ML/ })
    .click();
  await expect(page).toHaveURL(/#\/learn\/ml\/foundations\/what-is-ml$/);
  await expect(
    page.getByRole('heading', { name: 'Rules you write vs rules a program learns' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Mark complete' }).click();
  await page.getByRole('button', { name: 'Bookmark' }).click();
  await page.goBack();
  await expect(page.getByRole('region', { name: 'Prerequisites' })).toContainText('✓ Complete');

  await page.reload();
  await expect(page.getByRole('region', { name: 'Prerequisites' })).toContainText('✓ Complete');
  await page.goto('./#/');
  // Content threads add written lessons, so only the completed count is fixed.
  await expect(
    page
      .getByRole('region', { name: 'Progress by track' })
      .getByRole('link', { name: /Machine Learning Engineer/ }),
  ).toContainText(/T\.01\s*Machine Learning Engineer\s*1 of [1-9]\d*\s*written/);
  await expect(page.getByRole('region', { name: 'Bookmarks and recent lessons' })).toContainText(
    'What AI, ML',
  );
});

test('glossary term opens inline with a link to its lesson', async ({ page }) => {
  await page.goto('./#/learn/ml/foundations/what-is-ml');
  await page.getByRole('button', { name: 'dataset' }).click();
  const popover = page.getByRole('dialog', { name: 'Definition: Dataset' });
  await expect(popover).toContainText('A collection of examples');
  await popover.getByRole('link', { name: 'Open in glossary' }).click();
  await expect(page).toHaveURL(/glossary\?term=dataset/);
  await expect(page.locator('#term-dataset')).toBeFocused();
});

test('toggles theme and remembers it', async ({ page }) => {
  const html = page.locator('html');
  const toggle = async () => {
    if (isPhone(page)) await page.getByRole('button', { name: 'Menu' }).click();
    await page.getByRole('button', { name: /^Theme:/ }).click();
    if (isPhone(page)) await page.keyboard.press('Escape');
  };
  await toggle(); // system → light
  await expect(html).toHaveAttribute('data-theme', 'light');
  await toggle(); // light → dark
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'dark');
});

test('searches with the keyboard', async ({ page }) => {
  await page.keyboard.press('ControlOrMeta+k');
  const dialog = page.getByRole('dialog', { name: 'Search' });
  await expect(dialog).toBeVisible();
  await page.keyboard.type('gradient');
  await expect(dialog.getByRole('option').first()).toBeVisible();
  await expect(
    dialog.getByRole('option', { name: /Partial derivatives, gradients and the chain rule/ }),
  ).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/#\/(learn|glossary)/);
});

test('pixel grid opens a lesson from the keyboard', async ({ page }) => {
  await page.goto('./#/learn/ml');
  const map = page.getByRole('region', { name: 'Machine Learning Engineer lesson map' });
  await map.getByRole('link').first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(map).toContainText('T.01 // 002');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/learn\/ml\/foundations\/types-of-ml$/);
});

test('lesson sidebar opens as a drawer on phones', async ({ page }) => {
  test.skip(!isPhone(page), 'phone layout only');
  await page.goto('./#/learn/ml/foundations/what-is-ml');
  await page.getByRole('button', { name: 'Chapter lessons' }).click();
  const drawer = page.getByRole('dialog', { name: 'Foundations' });
  await drawer.getByRole('link', { name: /Python: values/ }).click();
  await expect(drawer).toBeHidden();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Python: values');
});

test('storage failure shows a notice and the app keeps working', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('blocked', 'SecurityError');
    };
  });
  await page.goto('./#/learn/ml/foundations/what-is-ml');
  await page.reload();
  await expect(page.getByRole('status').filter({ hasText: 'progress won’t be saved' })).toBeVisible();
  await page.getByRole('button', { name: 'Mark complete' }).click();
  await expect(page.getByRole('button', { name: '✓ Completed' })).toBeVisible();
});

test('corrupt saved progress is reset with a notice', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('mlp:v1', '{broken'));
  await page.reload();
  await expect(page.getByRole('status').filter({ hasText: 'mlp:backup' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('mlp:backup'))).toBe('{broken');
});

for (const [name, path] of [
  ['dashboard', './#/'],
  ['track page', './#/learn/ml'],
  ['written lesson', './#/learn/ml/foundations/what-is-ml'],
  ['outline lesson', './#/learn/inference/memory/memory-estimation'],
  ['glossary', './#/glossary'],
  ['settings', './#/settings'],
] as const) {
  test(`axe: ${name} has no serious or critical violations, in both themes`, async ({ page }) => {
    for (const theme of ['light', 'dark']) {
      await page.evaluate(
        (t) => localStorage.setItem('mlp:v1', JSON.stringify({ schema: 1, theme: t })),
        theme,
      );
      await page.goto(path);
      await page.reload();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expectNoSeriousA11yIssues(page);
      await expectNoHorizontalScroll(page);
    }
  });
}

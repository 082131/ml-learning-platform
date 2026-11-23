import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// The Git track. Sandboxes: a guided step must add output and, for committing steps, a commit to the graph. Other
// visuals: changing one control must change the visualization's data attribute or readout. Expected values come
// from src/lib/git/*.test.ts and the scenario replays against real Git.

const SANDBOXES = [
  { path: 'foundations/why-version-control', h1: 'Version control and the three areas', exp: 'git-basics', steps: 4, commits: 1 },
  { path: 'foundations/objects-hashes', h1: 'Inside .git', exp: 'git-objects', steps: 6, commits: 1 },
  { path: 'branching/branches-head', h1: 'Branches, HEAD', exp: 'git-branching', steps: 4, commits: 3 },
  { path: 'branching/merge-rebase', h1: 'Merge, rebase', exp: 'git-merge-rebase', steps: 3, commits: 7 },
  { path: 'branching/merge-conflicts', h1: 'Resolving merge conflicts', exp: 'git-conflict', steps: 8, commits: 4 },
  { path: 'branching/undoing-changes', h1: 'Undoing things', exp: 'git-undo', steps: 7, commits: 5 },
  { path: 'github/remotes', h1: 'Remotes', exp: 'git-remote', steps: 3, commits: 4 },
  { path: 'releases/semver-releases', h1: 'Semantic versioning', exp: 'git-release', steps: 6, commits: 4 },
  { path: 'capstone/release-ml-repo', h1: 'Capstone: ship a feature', exp: 'git-capstone', steps: 4, commits: 3 },
] as const;

async function open(page: Page, path: string, h1: string) {
  await page.goto(`./#/learn/git/${path}`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(h1);
}

for (const l of SANDBOXES)
  test(`${l.path}: guided steps run commands and grow the commit graph`, async ({ page }) => {
    await open(page, l.path, l.h1);
    const panel = page.locator(`[data-experiment="${l.exp}"]`);
    const next = panel.getByRole('button', { name: /^Next step/ });
    for (let i = 0; i < l.steps; i++) await next.click();
    await expect(panel.getByRole('list', { name: 'Terminal output' }).locator('li')).not.toHaveCount(0);
    await expect(panel.locator('[data-commit]')).toHaveCount(l.commits);
    await panel.getByRole('textbox', { name: 'Command' }).fill('git log --oneline');
    await panel.getByRole('textbox', { name: 'Command' }).press('Enter');
    await expect(panel.getByRole('list', { name: 'Terminal output' })).toContainText('git log --oneline');
  });

test('merge lab: a clean example has no conflict markers', async ({ page }) => {
  await open(page, 'branching/merge-conflicts', 'Resolving merge conflicts');
  const panel = page.locator('[data-experiment="git-merge-lab"]');
  await expect(panel.locator('[data-conflicts]')).toHaveAttribute('data-conflicts', '1');
  await panel.getByRole('combobox', { name: 'Example', exact: true }).selectOption('separate');
  await expect(panel.locator('[data-conflicts]')).toHaveAttribute('data-conflicts', '0');
  await expect(panel.getByTestId('merge-result')).not.toContainText('<<<<<<<');
});

test('merge box and CODEOWNERS respond to their inputs', async ({ page }) => {
  await open(page, 'github/pull-requests', 'Pull requests');
  const box = page.locator('[data-experiment="git-protection"]');
  await expect(box.locator('[data-mergeable]')).toHaveAttribute('data-mergeable', 'false');
  await box.getByRole('combobox', { name: 'PR: required checks (CI)' }).selectOption('passing');
  await box.getByRole('combobox', { name: 'PR: a code owner approved' }).selectOption('yes');
  await box.getByRole('combobox', { name: 'PR: branch is behind main' }).selectOption('no');
  for (const name of ['PR: approvals given', 'PR: unresolved conversations']) {
    await box.getByRole('slider', { name }).focus();
    await page.keyboard.press(name.includes('approvals') ? 'End' : 'Home');
  }
  await expect(box.locator('[data-mergeable]')).toHaveAttribute('data-mergeable', 'true');

  const owners = page.locator('[data-experiment="git-codeowners"]');
  await owners.getByRole('textbox', { name: 'Changed file' }).fill('src/serving/vendor/fast.py');
  await expect(owners.getByRole('region', { name: 'What CODEOWNERS decides' })).toContainText('nobody');
});

test('build matrix counts jobs', async ({ page }) => {
  await open(page, 'github/actions-ci', 'GitHub Actions');
  const panel = page.locator('[data-experiment="git-matrix"]');
  await expect(panel.locator('[data-jobs]')).toHaveAttribute('data-jobs', '3');
  await panel.getByRole('combobox', { name: 'os', exact: true }).selectOption('ubuntu-latest, windows-latest, macos-latest');
  await expect(panel.locator('[data-jobs]')).toHaveAttribute('data-jobs', '9');
});

test('semver, ranges, storage, docstrings and the Diataxis sorter respond', async ({ page }) => {
  await open(page, 'releases/semver-releases', 'Semantic versioning');
  const sv = page.locator('[data-experiment="git-semver"]');
  await sv.getByRole('combobox', { name: 'Commits since the last release' }).selectOption('breaking');
  await expect(sv.getByRole('region', { name: 'What the release tool computes' })).toContainText('2.0.0');
  const rg = page.locator('[data-experiment="git-ranges"]');
  await rg.getByRole('combobox', { name: 'npm range' }).selectOption('~1.2.3');
  await expect(rg.locator('[data-range]')).toHaveAttribute('data-range', '~1.2.3');

  await open(page, 'releases/ml-versioning', 'Versioning data and models');
  const st = page.locator('[data-experiment="git-storage"]');
  await st.getByRole('slider', { name: 'Versions released' }).focus();
  await page.keyboard.press('Home');
  await expect(st.getByRole('region', { name: 'What each approach stores' })).toContainText('0.5 GB');

  await open(page, 'docs/readmes-docstrings', 'READMEs, docstrings');
  const ds = page.locator('[data-experiment="git-docstrings"]');
  await expect(ds.locator('[data-problems]')).toHaveAttribute('data-problems', '0');
  await ds.getByRole('combobox', { name: 'Docstring' }).selectOption('stale');
  await expect(ds.locator('[data-problems]')).toHaveAttribute('data-problems', '3');

  await open(page, 'docs/docs-sites', 'docs sites');
  const so = page.locator('[data-experiment="git-diataxis"]');
  await so.locator('[data-snippet="api"]').getByRole('button', { name: 'Reference' }).click();
  await expect(so.getByRole('region', { name: 'Your sorting' })).toContainText('1 of 8, 1 matching');
});

const ALL = [
  'foundations/why-version-control',
  'foundations/objects-hashes',
  'branching/branches-head',
  'branching/merge-rebase',
  'branching/merge-conflicts',
  'branching/undoing-changes',
  'github/remotes',
  'github/pull-requests',
  'github/actions-ci',
  'releases/semver-releases',
  'releases/ml-versioning',
  'docs/readmes-docstrings',
  'docs/docs-sites',
  'capstone/release-ml-repo',
];

for (const path of ALL)
  test(`${path}: no serious accessibility issues and no horizontal scroll, in both themes`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`./#/learn/git/${path}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.waitForLoadState('networkidle');
    for (const theme of ['light', 'dark']) {
      await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
      const results = await new AxeBuilder({ page }).analyze();
      const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(serious.map((v) => `${theme} ${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  });

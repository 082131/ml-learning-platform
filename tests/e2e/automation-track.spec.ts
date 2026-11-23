import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// The Automation track. Every visual must react to its controls: changing one control changes the visual's data
// attribute. Expected values come from src/lib/automation/automation.test.ts and the experiment defaults.

async function open(page: Page, path: string, h1: string) {
  await page.goto(`./#/learn/automation/${path}`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(h1);
}

const panel = (page: Page, id: string) => page.locator(`[data-experiment="${id}"]`).first();

async function slideTo(page: Page, box: ReturnType<typeof panel>, name: string, key: 'Home' | 'End') {
  await box.getByRole('slider', { name }).focus();
  await page.keyboard.press(key);
}

test('payback chart and file organizer respond', async ({ page }) => {
  await open(page, 'scripting/what-to-automate', 'What to automate');
  const worth = panel(page, 'auto-worth');
  await expect(worth.locator('[data-breakeven]')).toHaveAttribute('data-breakeven', '3');
  await slideTo(page, worth, 'Hours to build', 'End');
  await expect(worth.locator('[data-breakeven]')).toHaveAttribute('data-breakeven', 'never');

  await open(page, 'scripting/cli-scripts', 'Command-line scripts');
  const org = panel(page, 'auto-organize');
  await expect(org.locator('[data-moves]')).toHaveAttribute('data-moves', '5');
  await org.getByRole('combobox', { name: 'Folder', exact: true }).selectOption('clash');
  await expect(org.locator('[data-moves]')).toHaveAttribute('data-moves', '1');
  await expect(org.locator('[data-lost]')).toHaveAttribute('data-lost', '0');
  await org.getByRole('combobox', { name: 'Overwrite existing files' }).selectOption('yes');
  await expect(org.locator('[data-lost]')).toHaveAttribute('data-lost', '2');
});

test('cron explorer lists runs and rejects invalid fields', async ({ page }) => {
  await open(page, 'scheduling/cron-schedules', 'Scheduling with cron');
  const cron = panel(page, 'auto-cron');
  await expect(cron.getByTestId('cron-runs')).toContainText('Tue 2026-11-24 02:00');
  await cron.getByRole('textbox', { name: 'Cron expression' }).fill('61 * * * *');
  await expect(cron.locator('[data-valid="false"]').first()).toBeVisible();
  await cron.getByRole('textbox', { name: 'Cron expression' }).fill('0 0 1,15 * 5');
  await expect(cron.locator('[data-valid="true"]')).toBeVisible();
  await expect(cron).toContainText('day of month OR day of week');
});

test('retry explorer and rerun lab respond', async ({ page }) => {
  await open(page, 'scheduling/apis-retries', 'Calling APIs reliably');
  const retry = panel(page, 'auto-retry');
  await expect(retry.locator('[data-attempts]')).toHaveAttribute('data-attempts', '3');
  await expect(retry.locator('[data-attempts]')).toHaveAttribute('data-ok', 'true');
  await retry.getByRole('combobox', { name: 'Strategy' }).selectOption('none');
  await expect(retry.locator('[data-attempts]')).toHaveAttribute('data-ok', 'false');

  await open(page, 'scheduling/rerun-safe-jobs', 'safe to rerun');
  const rerun = panel(page, 'auto-rerun');
  await expect(rerun.locator('[data-duplicates]')).toHaveAttribute('data-duplicates', '8');
  await rerun.getByRole('combobox', { name: 'Write strategy' }).selectOption('checkpoint-upsert');
  await expect(rerun.locator('[data-duplicates]')).toHaveAttribute('data-duplicates', '0');
});

test('workflow simulator and release gate respond', async ({ page }) => {
  await open(page, 'cicd/ml-ci-pipelines', 'CI pipelines for ML');
  const wf = panel(page, 'auto-workflow');
  await expect(wf.locator('ul[data-conclusion]')).toHaveAttribute('data-conclusion', 'success');
  await wf.getByRole('combobox', { name: 'Job that fails' }).selectOption('unit-tests');
  await expect(wf.locator('ul[data-conclusion]')).toHaveAttribute('data-conclusion', 'failure');
  await expect(wf.locator('[data-job="train-smoke"]')).toHaveAttribute('data-status', /skipped/);

  await open(page, 'cicd/model-delivery', 'Continuous delivery of models');
  const gate = panel(page, 'auto-gate');
  await expect(gate.locator('[data-stage]')).toHaveAttribute('data-stage', 'staging');
  await gate.getByRole('combobox', { name: 'Reviewer approved production' }).selectOption('yes');
  await expect(gate.locator('[data-stage]')).toHaveAttribute('data-stage', 'production');
  await gate.getByRole('combobox', { name: 'Retrained candidate' }).selectOption('slice');
  await expect(gate.locator('[data-stage]')).toHaveAttribute('data-stage', 'registered');
});

test('DAG scheduler and run planner respond', async ({ page }) => {
  await open(page, 'pipelines/dag-orchestration', 'Orchestrating pipelines');
  const dag = panel(page, 'auto-dag');
  await expect(dag.locator('[data-dag-state]')).toHaveAttribute('data-makespan', '29');
  await dag.getByRole('combobox', { name: 'features succeeds on attempt' }).selectOption('0');
  await expect(dag.locator('[data-dag-state]')).toHaveAttribute('data-dag-state', 'failed');
  await dag.getByRole('combobox', { name: 'notify trigger_rule' }).selectOption('all_done');
  await expect(dag.locator('[data-dag-state]')).toHaveAttribute('data-dag-state', 'success');

  await open(page, 'pipelines/schedules-backfills', 'Schedules, catchup and backfills');
  const plan = panel(page, 'auto-intervals');
  await expect(plan.locator('[data-runs]')).toHaveAttribute('data-runs', '1');
  await plan.getByRole('combobox', { name: 'catchup', exact: true }).selectOption('yes');
  await expect(plan.locator('[data-runs]')).toHaveAttribute('data-runs', '6');
});

test('webhook signature, deliveries and agent guardrails respond', async ({ page }) => {
  await open(page, 'events/webhooks', 'Webhooks');
  const sig = panel(page, 'auto-signature');
  await expect(sig.locator('[data-valid]').first()).toHaveAttribute('data-valid', 'true');
  await sig.getByRole('combobox', { name: 'Body the receiver checks' }).selectOption('reformatted');
  await expect(sig.locator('[data-valid]').first()).toHaveAttribute('data-valid', 'false');
  const del = panel(page, 'auto-delivery');
  await expect(del.locator('[data-duplicates]')).not.toHaveAttribute('data-duplicates', '0');
  await del.getByRole('combobox', { name: 'Handler' }).selectOption('queue');
  await expect(del.locator('[data-duplicates]')).toHaveAttribute('data-duplicates', '0');

  await open(page, 'events/agent-guardrails', 'AI agents');
  const agent = panel(page, 'auto-agent');
  await expect(agent.locator('[data-leaked]')).toHaveAttribute('data-leaked', 'true');
  await agent.getByRole('combobox', { name: 'Autonomy' }).selectOption('approve-risky');
  await expect(agent.locator('[data-leaked]')).toHaveAttribute('data-leaked', 'false');
});

test('capstone rehearsals react and link to the exam', async ({ page }) => {
  await open(page, 'capstone/nightly-pipeline', 'Capstone');
  const dag = panel(page, 'auto-capstone-dag');
  await expect(dag.locator('[data-dag-state]')).toHaveAttribute('data-dag-state', 'success');
  const gate = panel(page, 'auto-capstone-gate');
  await gate.getByRole('combobox', { name: 'Data checks passed' }).selectOption('no');
  await expect(gate.locator('[data-stage]')).not.toHaveAttribute('data-stage', 'production');
  await expect(page.locator('a[href="#/exam/automation"]').first()).toBeVisible();
});

const ALL = [
  'scripting/what-to-automate',
  'scripting/cli-scripts',
  'scheduling/cron-schedules',
  'scheduling/apis-retries',
  'scheduling/rerun-safe-jobs',
  'cicd/ml-ci-pipelines',
  'cicd/model-delivery',
  'pipelines/dag-orchestration',
  'pipelines/schedules-backfills',
  'events/webhooks',
  'events/agent-guardrails',
  'capstone/nightly-pipeline',
];
for (const path of ALL)
  test(`${path}: no serious accessibility issues and no horizontal scroll, in both themes`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`./#/learn/automation/${path}`);
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

test('the automation exam and interview screen open', async ({ page }) => {
  await page.goto('./#/exam/automation');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Automation');
  await expect(page.getByRole('button', { name: 'Start the exam' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});

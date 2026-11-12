import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// One row per Model Deployment lesson: changing one control must change the visualization's data attribute and
// the readout together (they share one experiment state). Expected values come from src/lib/deploy/*.test.ts.
const LESSONS = [
  {
    path: 'foundations/deployment-map',
    h1: 'The deployment map',
    exp: 'stack',
    attr: 'data-format',
    before: 'GGUF, Q4_K_M',
    control: { role: 'combobox', name: 'Model', value: 'vision' },
    after: 'ONNX (FP32 or FP16)',
    readout: '0.10 GB of 16 GB',
  },
  {
    path: 'pipelines/data-model-pipelines',
    h1: 'Data and model pipelines',
    exp: 'pipe',
    attr: 'data-ran',
    before: '3',
    control: { role: 'combobox', name: 'Data version', value: 'v2' },
    after: '5',
    readout: 'register: promoted, 0.9694 beats production 0.9639',
  },
  {
    path: 'kubernetes/k8s-for-models',
    h1: 'Kubernetes for models',
    exp: 'sched',
    attr: 'data-pending',
    before: '0',
    control: { role: 'slider', name: 'Replicas', key: 'End' },
    after: '4',
    readout: 'pod-2 -> cpu-a (score 50)',
  },
  {
    path: 'kubernetes/autoscaling-rollouts',
    h1: 'Autoscaling and rollouts',
    exp: 'hpa',
    attr: 'data-hpa-over',
    before: '8.4',
    control: { role: 'slider', name: 'Cold start: model load time (s)', key: 'Home' },
    after: '0.0',
    readout: '5 min demand 60.0 rps',
  },
  {
    path: 'quantization/llm-quantization',
    h1: 'Quantizing LLMs',
    exp: 'blockq',
    attr: 'data-quant-rmse',
    before: '0.001597',
    control: { role: 'combobox', name: 'Format', value: 'Q8_0' },
    after: '0.000089',
    readout: 'RMSE 0.000089',
  },
  {
    path: 'formats/onnx-gguf',
    h1: 'Model formats',
    exp: 'gguf',
    attr: 'data-gguf-start',
    before: '24',
    control: { role: 'combobox', name: 'Part of the file', value: 'data-1' },
    after: '288',
    readout: 'data proj.weight: 34 bytes',
  },
  {
    path: 'local/llama-cpp-ollama',
    h1: 'Running LLMs with llama.cpp and Ollama',
    exp: 'offload',
    attr: 'data-ngl',
    before: '32',
    control: { role: 'combobox', name: 'GPU', value: 'none' },
    after: '0',
    readout: '-ngl 0: 0 of 32',
  },
  {
    path: 'llm-serving/vllm-kserve',
    h1: 'Serving LLMs at scale',
    exp: 'paged',
    attr: 'data-paged',
    before: '117',
    control: { role: 'combobox', name: 'block_size (tokens)', value: '32' },
    after: '115',
    readout: '4096 blocks of 32 tokens',
  },
] as const;

for (const l of LESSONS)
  test(`${l.path}: the control drives the visualization and the readout`, async ({ page }) => {
    await page.goto(`./#/learn/deploy/${l.path}`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(l.h1);
    const viz = page.locator(`[${l.attr}]`).first();
    await expect(viz).toHaveAttribute(l.attr, l.before);

    const c = l.control;
    const panel = page
      .locator(`[data-experiment="${l.exp}"]`)
      .filter({ has: page.getByRole(c.role, { name: c.name, exact: true }) })
      .first();
    const input = panel.getByRole(c.role, { name: c.name, exact: true });
    if ('value' in c) await input.selectOption(c.value);
    else {
      await input.focus();
      await page.keyboard.press(c.key);
    }
    await expect(viz).toHaveAttribute(l.attr, l.after);
    await expect(panel.getByRole('region', { name: 'Result' })).toContainText(l.readout);
  });

test('the capstone shows its brief', async ({ page }) => {
  await page.goto('./#/learn/deploy/capstone/quantize-and-ship');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Capstone: quantize, package and ship');
  await expect(page.getByText('Quantize to Q8_0, Q4_K_M and Q4_0', { exact: false }).first()).toBeVisible();
});

for (const path of [...LESSONS.map((l) => l.path), 'capstone/quantize-and-ship'])
  test(`${path}: no serious accessibility issues and no horizontal scroll, in both themes`, async ({ page }) => {
    await page.goto(`./#/learn/deploy/${path}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.waitForLoadState('networkidle');
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

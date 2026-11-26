// Code for "Pretraining at scale". The explorer uses src/lib/finetune/scaling.ts (unit-tested). GPU peaks are the
// dense BF16 numbers from NVIDIA's data sheets; MFU and the dollar price are assumptions, so outputs are estimates.
// budget.py runs under CPython 3.13 and Pyodide; its output is checked by python-outputs.test.ts.
import { computeExperiment } from '@/lib/finetune/experiments';
import type { CodeExample } from '@/lib/types';

export const compute = computeExperiment('ft-compute');

export const budgetCode: CodeExample = {
  id: 'ft-budget',
  language: 'python',
  run: 'pyodide',
  source: `import math

def training_flops(params, tokens):
    return 6 * params * tokens              # 2 (forward) + 4 (backward) FLOPs per parameter per token

def gpu_hours(flops, peak_flops, mfu):
    return flops / (peak_flops * mfu) / 3600

def compute_optimal(flops, tokens_per_param=20):
    params = math.sqrt(flops / (6 * tokens_per_param))   # from C = 6 * N * (20 * N)
    return params, tokens_per_param * params

N, D = 7e9, 2e12                            # a 7B model on 2 trillion tokens
C = training_flops(N, D)
hours = gpu_hours(C, peak_flops=989e12, mfu=0.40)   # H100, dense BF16, 40% utilization
print(f"compute:          {C:.2e} FLOPs")
print(f"tokens/parameter: {D / N:.0f}")
print(f"GPU-hours:        {hours:,.0f}")
print(f"days on 512 GPUs: {hours / 512 / 24:.1f}")
n_opt, d_opt = compute_optimal(C)
print(f"compute-optimal for this budget: {n_opt / 1e9:.1f}B params on {d_opt / 1e9:.0f}B tokens")`,
  expectedOutput: `compute:          8.40e+22 FLOPs
tokens/parameter: 286
GPU-hours:        58,982
days on 512 GPUs: 4.8
compute-optimal for this budget: 26.5B params on 529B tokens`,
  annotations: [
    {
      id: 'six',
      range: { line: 4 },
      kind: 'math',
      title: 'Why 6',
      what: 'In the forward pass each parameter does one multiply and one add per token: 2 FLOPs. The backward pass computes gradients for both the inputs and the weights, about twice the forward work: 4 FLOPs.',
      why: 'This one line turns "how big, how much data" into "how much compute", which is what GPUs, time and money are measured in.',
    },
    {
      id: 'mfu',
      range: { line: 7 },
      kind: 'math',
      title: 'Peak × utilization',
      what: 'No real job runs at the GPU’s peak. Model FLOPs utilization (MFU) is the share it achieves, often 35 to 50% for well-tuned large runs.',
      why: 'Dividing by peak alone would promise a run 2 to 3 times faster than reality.',
    },
    {
      id: 'opt',
      range: { line: 10 },
      kind: 'math',
      title: 'Solving for the best size',
      what: 'With D = 20·N, C = 6·N·20·N = 120·N², so N = √(C / 120).',
      why: 'It answers: "with this much compute, how big should the model be to reach the lowest loss?"',
    },
    {
      id: 'peak',
      range: { line: 15 },
      kind: 'parameter',
      title: '989 TFLOP/s',
      what: 'The H100 SXM’s dense BF16 tensor-core peak. The data sheet’s larger number (1,979) assumes structured sparsity, which training does not use.',
      why: 'Using the sparse number would halve every time estimate.',
    },
  ],
};

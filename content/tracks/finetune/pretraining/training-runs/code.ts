// Code for "Running a training job". The explorers use src/lib/finetune/schedule.ts (unit-tested); the cosine shape
// matches Transformers' get_cosine_with_min_lr_schedule_with_warmup. run_math.py runs under CPython 3.13 and Pyodide
// (checked by python-outputs.test.ts). train_args.py was checked against transformers 5.24.1's TrainingArguments
// fields and SchedulerType names; it is not run here.
import { batchExperiment, scheduleExperiment } from '@/lib/finetune/experiments';
import type { CodeExample } from '@/lib/types';

export const schedule = scheduleExperiment('ft-schedule');
export const batch = batchExperiment('ft-batch');

export const runMath: CodeExample = {
  id: 'ft-run-math',
  language: 'python',
  run: 'pyodide',
  source: `import math

def lr_at(step, peak, warmup, total, min_ratio=0.1):
    if step < warmup:                                   # linear warmup from 0
        return peak * step / warmup
    progress = (step - warmup) / (total - warmup)       # 0 at the end of warmup, 1 at the last step
    floor = peak * min_ratio
    return floor + (peak - floor) * 0.5 * (1 + math.cos(math.pi * progress))

for step in [0, 15, 30, 515, 1000]:
    print(f"step {step:>4}: lr = {lr_at(step, 2e-4, 30, 1000):.2e}")

# Effective batch: micro batch x gradient accumulation x GPUs, then x tokens per sequence
micro, accum, gpus, seq_len = 4, 8, 2, 2048
seqs = micro * accum * gpus
print(f"{seqs} sequences = {seqs * seq_len:,} tokens per optimizer step")

# Gradient clipping by global norm
grads = [3.0, 4.0]                                      # norm 5
norm = math.sqrt(sum(g * g for g in grads))
scale = min(1.0, 1.0 / norm)
print(f"norm {norm:.1f} -> clipped to {[round(g * scale, 2) for g in grads]}")`,
  expectedOutput: `step    0: lr = 0.00e+00
step   15: lr = 1.00e-04
step   30: lr = 2.00e-04
step  515: lr = 1.10e-04
step 1000: lr = 2.00e-05
64 sequences = 131,072 tokens per optimizer step
norm 5.0 -> clipped to [0.6, 0.8]`,
  annotations: [
    {
      id: 'warmup',
      range: { line: 5 },
      kind: 'math',
      title: 'Warmup',
      what: 'For the first `warmup` steps the learning rate climbs in a straight line from 0 to the peak.',
      why: 'At the start, Adam’s running averages of the gradient are not yet reliable, and a full-size step on noisy estimates can wreck the weights. Small steps first let those statistics settle.',
    },
    {
      id: 'progress',
      range: { line: 6 },
      kind: 'math',
      title: 'Progress through the decay',
      what: 'Rescales the steps after warmup to the range 0 to 1.',
      why: 'The cosine formula then only needs to know "how far through are we".',
    },
    {
      id: 'cosine',
      range: { line: 8 },
      kind: 'math',
      title: 'Half a cosine',
      what: '0.5·(1 + cos(π·progress)) goes from 1 to 0 smoothly. Scaling it between the floor and the peak gives a curve that starts flat, falls fastest in the middle and flattens at the floor.',
      why: 'Big steps early make fast progress; small steps late let the weights settle into a good minimum instead of bouncing around it.',
    },
    {
      id: 'seqs',
      range: { line: 15 },
      kind: 'math',
      title: 'Effective batch',
      what: '4 per GPU × 8 accumulated passes × 2 GPUs = 64 sequences per optimizer step.',
      why: 'The learning rate you choose only makes sense together with the batch size, so always report both.',
    },
    {
      id: 'clip',
      range: { line: 21 },
      kind: 'math',
      title: 'Clip by global norm',
      what: 'If the gradient’s overall length exceeds 1.0, every component is scaled by the same factor so the length becomes 1.0. The direction is kept.',
      why: 'One strange batch can produce a huge gradient. Clipping caps how far a single step can move the weights, which turns many would-be loss spikes into harmless blips.',
    },
  ],
};

export const trainArgs: CodeExample = {
  id: 'ft-train-args',
  language: 'python',
  source: `# Not run here: the same choices as Hugging Face TrainingArguments (transformers 5).
from transformers import TrainingArguments

args = TrainingArguments(
    output_dir="runs/support-sft",
    per_device_train_batch_size=4,
    gradient_accumulation_steps=8,          # x 4 x GPUs = effective batch
    learning_rate=2e-4,                     # the peak
    lr_scheduler_type="cosine_with_min_lr",
    lr_scheduler_kwargs={"min_lr_rate": 0.1},
    warmup_steps=0.03,                      # a float below 1 is a fraction of all steps
    max_grad_norm=1.0,                      # gradient clipping (1.0 is also the default)
    num_train_epochs=3,
    bf16=True,
    logging_steps=10,
    eval_strategy="steps",
    eval_steps=50,
    save_steps=50,
)`,
  annotations: [
    {
      id: 'accum',
      range: { line: 7 },
      kind: 'parameter',
      title: 'gradient_accumulation_steps',
      what: 'Adds up gradients over 8 forward and backward passes before one optimizer step.',
      why: 'It gives a large effective batch on a GPU that only fits 4 sequences at a time. The result is the same as a batch of 32, just slower.',
    },
    {
      id: 'sched',
      range: { line: 9 },
      kind: 'parameter',
      title: 'cosine_with_min_lr',
      what: 'Cosine decay to a floor of min_lr_rate × peak (10% here) instead of to 0.',
      why: 'Decaying all the way to 0 wastes the last steps; a small floor keeps learning a little until the end.',
    },
    {
      id: 'warm',
      range: { line: 11 },
      kind: 'parameter',
      title: 'warmup_steps=0.03',
      what: 'In transformers 5, warmup_steps accepts a fraction of the total steps as well as a whole number.',
      why: 'A ratio keeps the warmup proportional if you change the dataset size or epochs.',
    },
    {
      id: 'eval',
      range: { line: 16 },
      kind: 'parameter',
      title: 'Evaluate during training',
      what: 'Computes the loss on a held-out set every 50 steps and saves a checkpoint at the same steps.',
      why: 'The training loss alone cannot show overfitting; with matching checkpoints you can keep the best one.',
    },
  ],
};

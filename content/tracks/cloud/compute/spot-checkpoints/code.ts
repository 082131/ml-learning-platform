// Code for "Spot capacity and checkpoints". The estimate and the example run are src/lib/cloud/spot.ts
// (unit-tested): interruptions as a constant-rate (Poisson) process, a labelled simplification. spot_math.py runs under
// CPython 3.13 and Pyodide (checked by python-outputs.test.ts). The PyTorch loop needs a GPU machine and is not run.
import { spotExperiment, type SpotState } from '@/lib/cloud/experiments';
import type { CodeExample } from '@/lib/types';

export const spot = spotExperiment('cloud-spot');

export const spotMath: CodeExample = {
  id: 'cloud-spot-math',
  language: 'python',
  run: 'pyodide',
  source: `import math

def expected_hours(work_h, every_min, save_min=3, restart_min=10, rate_per_h=0.1):
    """Expected wall-clock hours for work_h hours of training on capacity interrupted rate_per_h times an hour."""
    c, r = save_min / 60, restart_min / 60
    if every_min == 0:                                   # no checkpoints: start over after each interruption
        return (1 / rate_per_h + r) * math.expm1(rate_per_h * work_h)
    tau = every_min / 60
    base = work_h * (1 + c / tau)                        # work plus the pauses to save
    waste = rate_per_h * ((tau + c) / 2 + r)             # hours lost per hour of running
    return base / (1 - waste) if waste < 1 else math.inf

best = math.sqrt(2 * (3 / 60) / 0.1) * 60               # Young: sqrt(2 x save cost x mean time between interruptions)
print(f"best interval: {best:.0f} min; on-demand: 20.0 h, $20.00")
for every in (0, 10, 30, 60, 180):
    h = expected_hours(20, every)
    print(f"spot, checkpoint every {every:>3} min: {h:5.1f} h, \${h * 0.35:5.2f}")`,
  expectedOutput: `best interval: 60 min; on-demand: 20.0 h, $20.00
spot, checkpoint every   0 min:  65.0 h, $22.73
spot, checkpoint every  10 min:  26.7 h, $ 9.36
spot, checkpoint every  30 min:  23.0 h, $ 8.06
spot, checkpoint every  60 min:  22.6 h, $ 7.90
spot, checkpoint every 180 min:  24.5 h, $ 8.57`,
  annotations: [
    {
      id: 'no-ckpt',
      range: { line: 7 },
      kind: 'math',
      title: 'Without checkpoints, time explodes',
      what: '(1/λ + R)(e^(λW) − 1): the job must survive W hours in one stretch, and the chance of that falls exponentially with W.',
      why: 'A 20-hour job at 0.1 interruptions an hour expects to need 65 hours. A 40-hour job would need over 500.',
    },
    {
      id: 'base',
      range: { line: 9 },
      kind: 'math',
      title: 'The price of saving',
      what: 'Every τ hours of work you pause C hours to save: W(1 + C/τ) hours even with no interruptions.',
      why: 'Saving too often wastes time on saving; this term is what makes very short intervals worse.',
    },
    {
      id: 'waste',
      range: { line: 10 },
      kind: 'math',
      title: 'The price of losing work',
      what: 'An interruption lands, on average, halfway through a segment: it loses (τ + C)/2 of work, plus the restart R.',
      why: 'This term grows with τ. The best interval balances it against the saving term.',
    },
    {
      id: 'young',
      range: { line: 13 },
      kind: 'math',
      title: 'Young’s rule',
      what: 'τ* = √(2 C M), with C the save time and M = 1/λ the mean time between interruptions: √(2 × 0.05 h × 10 h) = 1 h.',
      why: 'A quick, standard way to choose the interval. The cost curve is flat near it, so roughly right is good enough.',
    },
  ],
};

export const loopCode: CodeExample = {
  id: 'cloud-spot-loop',
  language: 'python',
  source: `import os, signal, time, torch

CKPT = "/opt/ml/checkpoints/last.pt"        # synced to S3 (SageMaker) or a bucket you upload to
EVERY_S = {{interval}} * 60                   # checkpoint interval from the lab, in seconds
stop = False
signal.signal(signal.SIGTERM, lambda *_: globals().update(stop=True))   # the platform asks you to stop

start_step = 0
if os.path.exists(CKPT):                      # resume after an interruption
    state = torch.load(CKPT, map_location="cuda")
    model.load_state_dict(state["model"]); optimizer.load_state_dict(state["optim"])
    start_step = state["step"] + 1

last = time.monotonic()
for step in range(start_step, total_steps):
    train_step(model, optimizer, next(batches))
    if stop or time.monotonic() - last > EVERY_S:
        torch.save({"model": model.state_dict(), "optim": optimizer.state_dict(), "step": step}, CKPT + ".tmp")
        os.replace(CKPT + ".tmp", CKPT)       # atomic: a half-written file never replaces a good one
        last = time.monotonic()
        if stop:
            break`,
  slots: { interval: (s) => String((s as SpotState).intervalMin || 30) },
  annotations: [
    {
      id: 'sigterm',
      range: { line: 6 },
      kind: 'function',
      title: 'Listen for the warning',
      what: 'Before reclaiming capacity, AWS gives a two-minute interruption notice and Google Cloud a 30-second one. The shutdown that follows, or the container platform, delivers SIGTERM to your process.',
      why: 'A final checkpoint inside the warning loses almost nothing. Without the handler the job is killed mid-step.',
    },
    {
      id: 'resume',
      range: { line: 9 },
      kind: 'syntax',
      title: 'Resume, do not restart',
      what: 'If a checkpoint exists, load the weights, the optimizer state and the step number.',
      why: 'The optimizer state matters: resuming Adam without it changes the training run.',
    },
    {
      id: 'atomic',
      range: { line: 19 },
      kind: 'function',
      title: 'Write, then rename',
      what: 'os.replace swaps the new file in at once.',
      why: 'An interruption during torch.save would otherwise leave a corrupt checkpoint and lose everything.',
    },
  ],
};

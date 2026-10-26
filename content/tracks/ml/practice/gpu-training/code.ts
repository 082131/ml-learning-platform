// Code for ml/practice/gpu-training. The estimator's output was produced with CPython 3.13.16, and
// src/lib/practice/gpuTraining.test.ts checks the visual's TypeScript against it. The PyTorch loop was
// run with torch 2.14.1 on a CPU (no GPU was available); its output below is from that run.
import { gpuExperiment, type GpuState } from '@/lib/practice/gpuTraining';
import type { CodeExample } from '@/lib/types';

export const initial: GpuState = {
  gpu: 'A100 80GB',
  model: 'GPT-2 small',
  precision: 'mixed',
  batch: 16,
  checkpointing: false,
  fusedAttention: true,
  utilization: 0.4,
  loaderSamplesPerS: 400,
  overlap: true,
  tokensB: 10,
};

/** One state: the memory and step charts, the estimator's arguments and the readout. */
export const experiment = gpuExperiment('gpu-training', initial);

const st = (s: unknown) => s as GpuState;
const py = (b: boolean) => (b ? 'True' : 'False');

export const estimatorCode: CodeExample = {
  id: 'gpu-estimator',
  language: 'python',
  source: `GPUS = {  # NVIDIA datasheets; dense tensor-core peak (half the "with sparsity" figure)
    "T4":        {"memory_gb": 16, "fp32_tflops": 8.1,  "mixed_tflops": 65,    "mixed_dtype": "float16"},
    "L4":        {"memory_gb": 24, "fp32_tflops": 30.3, "mixed_tflops": 121,   "mixed_dtype": "bfloat16"},
    "A100 80GB": {"memory_gb": 80, "fp32_tflops": 19.5, "mixed_tflops": 312,   "mixed_dtype": "bfloat16"},
    "H100 SXM":  {"memory_gb": 80, "fp32_tflops": 67,   "mixed_tflops": 989.5, "mixed_dtype": "bfloat16"},
}
MODELS = {  # GPT-2 sizes: layers, hidden size, attention heads
    "GPT-2 small":  (12, 768, 12),
    "GPT-2 medium": (24, 1024, 16),
    "GPT-2 large":  (36, 1280, 20),
    "GPT-2 XL":     (48, 1600, 25),
}
VOCAB, SEQ = 50257, 1024

def parameters(layers, h):
    return 12 * layers * h * h + 13 * layers * h + (VOCAB + SEQ) * h + 2 * h

def activation_bytes(layers, h, heads, batch, fused_attention, checkpointing):
    """Korthikanti et al. (2022): s*b*h*(34 + 5*a*s/h) bytes per layer with 16-bit activations."""
    scores = 0 if fused_attention else 5 * heads * SEQ / h
    per_layer = SEQ * batch * h * (34 + scores)
    if checkpointing:  # keep each layer's input; recompute one layer at a time in the backward pass
        return layers * 2 * SEQ * batch * h + per_layer
    return layers * per_layer

def estimate(gpu, model, precision, batch, checkpointing, fused_attention,
             utilization, loader_samples_per_s, overlap, tokens_b):
    spec = GPUS[gpu]
    layers, h, heads = MODELS[model]
    p = parameters(layers, h)
    mixed = precision == "mixed"
    states = 16 * p  # fp32 weights 4 + gradients 4 + Adam moments 8 bytes per parameter
    acts = activation_bytes(layers, h, heads, batch, fused_attention, checkpointing)
    acts = acts if mixed else 2 * acts  # 4-byte activations take about twice as much
    logits = 4 * batch * SEQ * VOCAB  # float32 logits for the loss
    total = states + acts + logits
    fits = total <= spec["memory_gb"] * 1e9

    flops = (8 if checkpointing else 6) * p * batch * SEQ
    peak = spec["mixed_tflops"] if mixed else spec["fp32_tflops"]
    compute = flops / (peak * 1e12 * utilization)
    loading = batch / loader_samples_per_s
    step = max(compute, loading) if overlap else compute + loading
    tokens_per_s = batch * SEQ / step
    hours = tokens_b * 1e9 / tokens_per_s / 3600
    dtype = spec["mixed_dtype"] if mixed else "float32"

    print(f"model      {model}, {p:,} parameters")
    print(f"memory     states {states / 1e9:.2f} GB + activations {acts / 1e9:.2f} GB"
          f" + logits {logits / 1e9:.2f} GB = {total / 1e9:.2f} GB of {spec['memory_gb']} GB:"
          f" {'fits' if fits else 'does NOT fit'}")
    print(f"step       compute {compute:.3f} s, loading {loading:.3f} s,"
          f" step {step:.3f} s ({'overlapped' if overlap else 'one after the other'})")
    print(f"throughput {tokens_per_s:,.0f} tokens/s, GPU busy {100 * compute / step:.0f}% of the step")
    print(f"time       {hours:,.1f} h for {tokens_b} B tokens"
          f" (at {utilization:.0%} of {peak} TFLOPS {dtype})")

estimate(gpu={{gpu}}, model={{model}}, precision={{precision}}, batch={{batch}},
         checkpointing={{checkpointing}}, fused_attention={{fused}}, utilization={{utilization}},
         loader_samples_per_s={{loader}}, overlap={{overlap}}, tokens_b={{tokens}})`,
  slots: {
    gpu: (s) => `"${st(s).gpu}"`,
    model: (s) => `"${st(s).model}"`,
    precision: (s) => `"${st(s).precision}"`,
    batch: (s) => String(st(s).batch),
    checkpointing: (s) => py(st(s).checkpointing),
    fused: (s) => py(st(s).fusedAttention),
    utilization: (s) => String(st(s).utilization),
    loader: (s) => String(st(s).loaderSamplesPerS),
    overlap: (s) => py(st(s).overlap),
    tokens: (s) => String(st(s).tokensB),
  },
  annotations: [
    {
      id: 'gpus',
      range: {
        line: 1,
      },
      kind: 'variable',
      title: 'GPU datasheet numbers',
      what: 'Memory and peak throughput from NVIDIA’s datasheets. Tensor-core figures are dense: half of the “with sparsity” number the datasheets print for L4, A100 and H100.',
      why: 'Peak numbers are upper bounds no real training run reaches; the utilization assumption below turns them into an estimate.',
    },
    {
      id: 'models',
      range: {
        line: 7,
      },
      kind: 'variable',
      title: 'GPT-2 model shapes',
      what: 'Layers, hidden size and attention heads of the four GPT-2 sizes.',
      why: 'Parameters and activation memory both follow from these three numbers.',
    },
    {
      id: 'params',
      range: {
        line: 16,
      },
      kind: 'math',
      title: 'Parameter count of a GPT-2-style transformer',
      what: '12·L·h² for the attention and MLP weights, 13·L·h for biases and layer norms, (V + s)·h for the token and position embeddings (the output layer shares the token embedding), 2·h for the final layer norm.',
      why: 'For GPT-2 small this gives exactly 124,439,808, the published parameter count.',
    },
    {
      id: 'acts',
      range: {
        line: 21,
      },
      kind: 'math',
      title: 'Activation memory per layer',
      what: 's·b·h·(34 + 5·a·s/h) bytes with 16-bit activations (Korthikanti et al., 2022). The 5·a·s/h part is the attention scores, which a fused attention kernel does not store.',
      why: 'Activations, not weights, usually decide how large a batch fits.',
    },
    {
      id: 'ckpt',
      range: {
        line: 22,
      },
      kind: 'syntax',
      title: 'Activation checkpointing',
      what: 'Stores only each layer’s input (2·s·b·h bytes) and recomputes the rest of one layer at a time during the backward pass.',
      why: 'Trades memory for compute: about one extra forward pass, which is why the FLOPs factor becomes 8 instead of 6.',
    },
    {
      id: 'states',
      range: {
        line: 32,
      },
      kind: 'math',
      title: '16 bytes per parameter',
      what: 'float32 weights (4) + float32 gradients (4) + Adam’s two moment estimates (8). With torch.autocast the weights stay in float32, so mixed precision does not shrink this part.',
      why: 'For large models this alone exceeds a GPU: 16 bytes × 1.5 billion parameters is 25 GB.',
    },
    {
      id: 'flops',
      range: {
        line: 39,
      },
      kind: 'math',
      title: 'Training FLOPs ≈ 6 · parameters · tokens',
      what: '2 FLOPs per parameter per token for the forward pass and about 4 for the backward pass (Kaplan et al., 2020). It leaves out the attention-score FLOPs, which add a few percent at this sequence length.',
      why: 'The standard first estimate of training cost.',
    },
    {
      id: 'compute',
      range: {
        line: 41,
      },
      kind: 'math',
      title: 'Compute time per step',
      what: 'FLOPs divided by the achieved throughput: the datasheet peak times the assumed utilization.',
      why: 'Utilization of 30–50% of peak is common for well-tuned transformer training; small models and small batches get less.',
    },
    {
      id: 'step',
      range: {
        line: 43,
      },
      kind: 'syntax',
      title: 'Overlapped or serial',
      what: 'With workers prefetching the next batch, a step takes as long as the slower of compute and loading; without overlap they add up.',
      why: 'If loading is slower than compute, a faster GPU does not help.',
    },
    {
      id: 'settings',
      range: {
        line: 60,
      },
      kind: 'parameter',
      title: 'Settings from the experiment',
      what: 'Every argument of this call is filled from the experiment controls.',
      why: 'Change one at a time and watch which line of the output moves.',
    },
  ],
};

export const estimatorRunner: CodeExample = {
  id: 'gpu-estimator-runner',
  language: 'python',
  run: 'pyodide',
  source: `GPUS = {  # NVIDIA datasheets; dense tensor-core peak (half the "with sparsity" figure)
    "T4":        {"memory_gb": 16, "fp32_tflops": 8.1,  "mixed_tflops": 65,    "mixed_dtype": "float16"},
    "L4":        {"memory_gb": 24, "fp32_tflops": 30.3, "mixed_tflops": 121,   "mixed_dtype": "bfloat16"},
    "A100 80GB": {"memory_gb": 80, "fp32_tflops": 19.5, "mixed_tflops": 312,   "mixed_dtype": "bfloat16"},
    "H100 SXM":  {"memory_gb": 80, "fp32_tflops": 67,   "mixed_tflops": 989.5, "mixed_dtype": "bfloat16"},
}
MODELS = {  # GPT-2 sizes: layers, hidden size, attention heads
    "GPT-2 small":  (12, 768, 12),
    "GPT-2 medium": (24, 1024, 16),
    "GPT-2 large":  (36, 1280, 20),
    "GPT-2 XL":     (48, 1600, 25),
}
VOCAB, SEQ = 50257, 1024

def parameters(layers, h):
    return 12 * layers * h * h + 13 * layers * h + (VOCAB + SEQ) * h + 2 * h

def activation_bytes(layers, h, heads, batch, fused_attention, checkpointing):
    """Korthikanti et al. (2022): s*b*h*(34 + 5*a*s/h) bytes per layer with 16-bit activations."""
    scores = 0 if fused_attention else 5 * heads * SEQ / h
    per_layer = SEQ * batch * h * (34 + scores)
    if checkpointing:  # keep each layer's input; recompute one layer at a time in the backward pass
        return layers * 2 * SEQ * batch * h + per_layer
    return layers * per_layer

def estimate(gpu, model, precision, batch, checkpointing, fused_attention,
             utilization, loader_samples_per_s, overlap, tokens_b):
    spec = GPUS[gpu]
    layers, h, heads = MODELS[model]
    p = parameters(layers, h)
    mixed = precision == "mixed"
    states = 16 * p  # fp32 weights 4 + gradients 4 + Adam moments 8 bytes per parameter
    acts = activation_bytes(layers, h, heads, batch, fused_attention, checkpointing)
    acts = acts if mixed else 2 * acts  # 4-byte activations take about twice as much
    logits = 4 * batch * SEQ * VOCAB  # float32 logits for the loss
    total = states + acts + logits
    fits = total <= spec["memory_gb"] * 1e9

    flops = (8 if checkpointing else 6) * p * batch * SEQ
    peak = spec["mixed_tflops"] if mixed else spec["fp32_tflops"]
    compute = flops / (peak * 1e12 * utilization)
    loading = batch / loader_samples_per_s
    step = max(compute, loading) if overlap else compute + loading
    tokens_per_s = batch * SEQ / step
    hours = tokens_b * 1e9 / tokens_per_s / 3600
    dtype = spec["mixed_dtype"] if mixed else "float32"

    print(f"model      {model}, {p:,} parameters")
    print(f"memory     states {states / 1e9:.2f} GB + activations {acts / 1e9:.2f} GB"
          f" + logits {logits / 1e9:.2f} GB = {total / 1e9:.2f} GB of {spec['memory_gb']} GB:"
          f" {'fits' if fits else 'does NOT fit'}")
    print(f"step       compute {compute:.3f} s, loading {loading:.3f} s,"
          f" step {step:.3f} s ({'overlapped' if overlap else 'one after the other'})")
    print(f"throughput {tokens_per_s:,.0f} tokens/s, GPU busy {100 * compute / step:.0f}% of the step")
    print(f"time       {hours:,.1f} h for {tokens_b} B tokens"
          f" (at {utilization:.0%} of {peak} TFLOPS {dtype})")

estimate(gpu="A100 80GB", model="GPT-2 small", precision="mixed", batch=16,
         checkpointing=False, fused_attention=True, utilization=0.4,
         loader_samples_per_s=400, overlap=True, tokens_b=10)`,
  annotations: [],
  expectedOutput: `model      GPT-2 small, 124,439,808 parameters
memory     states 1.99 GB + activations 5.13 GB + logits 3.29 GB = 10.42 GB of 80 GB: fits
step       compute 0.098 s, loading 0.040 s, step 0.098 s (overlapped)
throughput 167,149 tokens/s, GPU busy 100% of the step
time       16.6 h for 10 B tokens (at 40% of 312 TFLOPS bfloat16)`,
};

export const ampLoop: CodeExample = {
  id: 'gpu-amp-loop',
  language: 'python',
  source: `import time
import torch
from torch import nn
from torch.utils.data import DataLoader, TensorDataset

device = "cuda" if torch.cuda.is_available() else "cpu"
# bfloat16 where supported (A100, H100, L4, and CPUs); float16 plus loss scaling on a T4
use_bf16 = device == "cpu" or torch.cuda.is_bf16_supported()
dtype = torch.bfloat16 if use_bf16 else torch.float16

torch.manual_seed(0)
x = torch.randn(4096, 256)
y = x @ torch.randn(256, 1) + 0.1 * torch.randn(4096, 1)
loader = DataLoader(TensorDataset(x, y), batch_size=256, shuffle=True,
                    num_workers=2, pin_memory=device == "cuda")

model = nn.Sequential(nn.Linear(256, 1024), nn.ReLU(), nn.Linear(1024, 1)).to(device)
optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3)
scaler = torch.amp.GradScaler(device, enabled=dtype == torch.float16)

for epoch in range(3):
    start = time.perf_counter()
    for xb, yb in loader:
        xb = xb.to(device, non_blocking=True)
        yb = yb.to(device, non_blocking=True)
        optimizer.zero_grad(set_to_none=True)
        with torch.autocast(device_type=device, dtype=dtype):
            loss = nn.functional.mse_loss(model(xb), yb)
        scaler.scale(loss).backward()
        scaler.step(optimizer)
        scaler.update()
    if device == "cuda":
        torch.cuda.synchronize()  # GPU work is asynchronous: wait before reading the clock
    print(f"epoch {epoch}  loss {loss.item():.4f}  {time.perf_counter() - start:.2f} s")

if device == "cuda":
    print(f"peak memory {torch.cuda.max_memory_allocated() / 1e9:.2f} GB")`,
  annotations: [
    {
      id: 'dtype',
      range: { line: 8 },
      kind: 'variable',
      title: 'bfloat16 or float16',
      what: 'bfloat16 where the hardware supports it, otherwise float16 (a T4 has no bfloat16 tensor cores).',
      why: 'bfloat16 has float32’s exponent range, so gradients do not underflow and no loss scaling is needed.',
    },
    {
      id: 'workers',
      range: { line: 15 },
      kind: 'parameter',
      title: 'Loader workers and pinned memory',
      what: 'num_workers > 0 loads batches in background processes; pin_memory puts them in page-locked host memory.',
      why: 'Workers overlap loading with compute; pinned memory lets the copy to the GPU run asynchronously.',
    },
    {
      id: 'scaler',
      range: { line: 19 },
      kind: 'function',
      title: 'Gradient scaling, only for float16',
      what: 'torch.amp.GradScaler multiplies the loss by a large factor before backward and divides the gradients again before the step.',
      why: 'float16 gradients that are too small round to zero. Enabled only when the dtype is float16.',
    },
    {
      id: 'non-blocking',
      range: { line: 24 },
      kind: 'syntax',
      title: 'Asynchronous copy to the device',
      what: 'With pinned memory, the copy can overlap with GPU work instead of blocking the Python thread.',
      why: 'Part of keeping the GPU busy.',
    },
    {
      id: 'autocast',
      range: { line: 27 },
      kind: 'syntax',
      title: 'Autocast region',
      what: 'Inside the block, operations that benefit (matrix multiplications, linear layers) run in the lower-precision dtype; precision-sensitive ones stay in float32.',
      why: 'The weights stay float32; only the forward computation is cast. The backward pass follows the same dtypes.',
    },
    {
      id: 'scale-backward',
      range: { line: 29 },
      kind: 'function',
      title: 'scale, step, update',
      what: 'Backward on the scaled loss; step() unscales and skips the update if gradients overflowed; update() adjusts the scale.',
      why: 'With enabled=False (bfloat16) these calls pass the loss and step through unchanged, so one loop serves both.',
    },
    {
      id: 'sync',
      range: { line: 33 },
      kind: 'function',
      title: 'Synchronize before timing',
      what: 'Waits until every queued GPU kernel has finished.',
      why: 'CUDA calls return before the GPU is done. Without this, a timer measures how fast Python queued the work, not the work.',
    },
    {
      id: 'peak-memory',
      range: { line: 37 },
      kind: 'function',
      title: 'Measure, then compare with the estimate',
      what: 'The most memory PyTorch’s allocator held for tensors during the run.',
      why: 'The estimator is a starting point; the measured peak is the number to trust.',
    },
  ],
};

export const ampOutput: CodeExample = {
  id: 'gpu-amp-output',
  language: 'bash',
  source: `pip install torch==2.14.1
python train_amp.py   # on a CPU: bfloat16 autocast, no scaler
# epoch 0  loss 259.9579  0.12 s
# epoch 1  loss 140.9398  0.12 s
# epoch 2  loss 38.8911  0.12 s`,
  annotations: [],
};

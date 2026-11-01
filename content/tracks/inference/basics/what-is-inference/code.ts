// Code for the inference vs training lesson. The estimator's printout is checked against CPython 3.13 in
// src/lib/inference/trainVsInfer.test.ts; the NumPy output below was produced with NumPy 2.5.3 on CPython 3.13.
import { ann, annLine } from '@/lib/inference/annotate';
import { TRAIN_INFER_SOURCE, trainInferExperiment, trainInferSlots, type TrainInferState } from '@/lib/inference/trainVsInfer';
import type { CodeExample } from '@/lib/types';
import type { FlowEdge, FlowNode } from '@/lib/viz/flow';

/** A 784 → 512 → 512 → 10 MLP, batch 64, trained with Adam. */
export const initial: TrainInferState = { hidden: 512, layers: 2, batch: 64, optimizer: 'adam' };

export const experiment = trainInferExperiment('train-infer', initial);

const st = (s: unknown) => s as TrainInferState;
const S = TRAIN_INFER_SOURCE;

export const estimateCode: CodeExample = {
  id: 'train-infer-estimate',
  language: 'python',
  source: S,
  slots: Object.fromEntries(
    ['hidden', 'layers', 'batch', 'optimizer'].map((k) => [k, (s: unknown) => trainInferSlots(st(s))[k]!]),
  ),
  annotations: [
    ann(S, 'widths', 'widths = [784]', '[784] + [{{hidden}}] * {{layers}} + [10]', {
      kind: 'variable',
      title: 'The layer widths',
      what: 'A flattened 28 × 28 image (784 numbers), then the hidden layers, then one score per digit.',
      why: 'Every number below is computed from these widths, the same way for training and for inference.',
    }),
    ann(S, 'params', 'params = sum', 'i * o + o', {
      kind: 'math',
      title: 'i * o + o',
      what: 'A dense layer from i inputs to o outputs has an i × o weight matrix and o biases.',
      why: 'The parameter count sets the weight memory, which training and inference both pay.',
    }),
    ann(S, 'macs', 'macs = sum', 'i * o', {
      kind: 'math',
      title: 'Multiply-adds per example',
      what: 'Each weight is used once per example in the forward pass: one multiplication and one addition.',
      why: 'Arithmetic is counted as 2 FLOPs per multiply-add, so a forward pass costs 2 · macs per example.',
    }),
    ann(S, 'grads', 'grads = 4', 'grads', {
      kind: 'variable',
      title: 'Gradients (training only)',
      what: 'Backpropagation computes one gradient per parameter, stored at the same precision as the weight.',
      why: 'Inference never computes gradients, so this memory disappears.',
    }),
    ann(S, 'opt', 'opt_state =', '{"sgd": 0, "momentum": 4, "adam": 8}[optimizer]', {
      kind: 'math',
      title: 'Optimizer state (training only)',
      what: 'Bytes per parameter the optimizer keeps between steps: none for plain SGD, one float32 for momentum, two for Adam.',
      why: 'With Adam a trained weight costs 16 bytes (weight, gradient, two moments); a served weight costs 4.',
    }),
    ann(S, 'infer-act', 'infer_act =', 'max(i + o for i, o in pairs)', {
      kind: 'math',
      title: 'One layer at a time',
      what: 'During inference a layer needs its input and its output; the input can be freed once the output exists.',
      why: 'So the peak is the widest layer, not the sum of all layers.',
    }),
    ann(S, 'train-act', 'train_act =', 'widths[0] + 2 * sum(widths[1:-1]) + widths[-1]', {
      kind: 'math',
      title: 'Everything is kept for backward',
      what: 'The input, each hidden layer’s value before and after ReLU, and the output scores.',
      why: 'Backpropagation reuses them to compute gradients, so they stay alive until the backward pass reaches them.',
    }),
    ann(S, 'train-flops', '"training FLOPs', '6 * macs * batch', {
      kind: 'math',
      title: '6 FLOPs per weight per example',
      what: '2 for the forward pass, about 4 for the backward pass (gradients for the inputs and for the weights).',
      why: 'The same rule of thumb is used to plan large training runs (Kaplan et al., 2020).',
    }),
  ],
};

const D = `import numpy as np

rng = np.random.default_rng(0)
W1 = rng.normal(0, 0.05, (784, 128)).astype(np.float32)
b1 = np.zeros(128, dtype=np.float32)
W2 = rng.normal(0, 0.05, (128, 10)).astype(np.float32)
b2 = np.zeros(10, dtype=np.float32)
x = rng.random((32, 784), dtype=np.float32)       # a batch of 32 "images"
y = rng.integers(0, 10, size=32)                  # their labels


def predict(x):                                   # inference: forward only
    h = np.maximum(x @ W1 + b1, 0)
    return (h @ W2 + b2).argmax(axis=1)


print("predictions:", predict(x)[:8])

# One training step: forward, keep what backward needs, gradients, update
z = x @ W1 + b1
h = np.maximum(z, 0)
logits = h @ W2 + b2
p = np.exp(logits - logits.max(axis=1, keepdims=True))
p /= p.sum(axis=1, keepdims=True)
loss = -np.log(p[np.arange(32), y]).mean()

d_logits = p.copy()
d_logits[np.arange(32), y] -= 1
d_logits /= 32
dW2, db2 = h.T @ d_logits, d_logits.sum(axis=0)
dz = (d_logits @ W2.T) * (z > 0)
dW1, db1 = x.T @ dz, dz.sum(axis=0)
for w, g in [(W1, dW1), (b1, db1), (W2, dW2), (b2, db2)]:
    w -= 0.1 * g                                  # SGD update, in place

print(f"loss before the update: {loss:.4f}")
print("weights:  ", sum(a.nbytes for a in [W1, b1, W2, b2]), "bytes")
print("gradients:", sum(a.nbytes for a in [dW1, db1, dW2, db2]), "bytes")
print("saved for backward:", sum(a.nbytes for a in [x, z, h, p]), "bytes")
print("predictions after one step:", predict(x)[:8])`;

/** Inference and one training step side by side, in NumPy. Output from NumPy 2.5.3. */
export const stepDemo: CodeExample = {
  id: 'train-infer-numpy',
  language: 'python',
  run: 'pyodide',
  source: D,
  annotations: [
    annLine(D, 'predict', 'def predict(x):', {
      kind: 'function',
      title: 'Inference is a function call',
      what: 'Input in, prediction out. The intermediate h is a local variable and is freed when the function returns.',
      why: 'Nothing is remembered between calls, which is why a served model can answer many requests independently.',
    }),
    ann(D, 'keep', 'z = x @ W1 + b1', 'z', {
      kind: 'variable',
      title: 'Values kept for backward',
      what: 'z (before ReLU), h (after ReLU) and p (the probabilities) are module-level variables here, so they stay alive.',
      why: 'The gradient lines below need them: (z > 0) for ReLU, h for dW2, p for the loss gradient.',
    }),
    annLine(D, 'update', 'w -= 0.1 * g', {
      kind: 'math',
      title: 'The weights change',
      what: 'Each weight moves a step against its gradient. In-place, so W1 itself is updated.',
      why: 'During training the weights change every step. During inference they are fixed, so they can be loaded once, shared, compressed or compiled.',
    }),
    annLine(D, 'grads-bytes', '"gradients:"', {
      kind: 'framework',
      title: 'Gradients cost as much as weights',
      what: 'One gradient per parameter, same shape and dtype.',
      why: 'Add an optimizer such as Adam and training needs 4 times the weight memory before counting activations.',
      output: '407080 bytes, equal to the weights',
    }),
  ],
  expectedOutput: `predictions: [2 2 2 2 2 2 2 2]
loss before the update: 2.3992
weights:   407080 bytes
gradients: 407080 bytes
saved for backward: 134400 bytes
predictions after one step: [5 0 5 5 1 0 5 7]`,
};

/** In PyTorch the same split is explicit: eval() plus inference_mode() for serving. */
export const torchServe: CodeExample = {
  id: 'train-infer-torch',
  language: 'python',
  source: `model = Net()
model.load_state_dict(torch.load("net.pt", weights_only=True))
model.eval()                       # dropout off, batch norm uses its stored statistics

with torch.inference_mode():       # no graph is recorded, no gradients can be computed
    logits = model(batch)          # (batch, 10)
    labels = logits.argmax(dim=1)  # (batch,)`,
  annotations: [
    {
      id: 'eval',
      range: { line: 3, startCol: 0, endCol: 12 },
      match: 'model.eval()',
      kind: 'framework',
      title: 'model.eval()',
      what: 'Switches layers that behave differently in training: dropout stops dropping values, batch norm uses its running averages.',
      why: 'Forgetting it makes predictions random (dropout) or dependent on the other requests in the batch (batch norm).',
    },
    {
      id: 'inference-mode',
      range: { line: 5, startCol: 5, endCol: 27 },
      match: 'torch.inference_mode()',
      kind: 'framework',
      title: 'torch.inference_mode()',
      what: 'Turns off autograd inside the block: operations do not record the graph that backward would need.',
      why: 'Saves memory (no saved activations) and a little time per operation. It is the serving counterpart of the training loop.',
    },
  ],
};

/** One online request through a served model. */
export const requestNodes: FlowNode[] = [
  { id: 'client', label: 'Client', detail: 'POST /predict', x: 0, y: 0, w: 150 },
  { id: 'pre', label: 'Preprocess', detail: 'JSON → (1, 784)', x: 200, y: 0, w: 160 },
  { id: 'model', label: 'Model forward', detail: 'fixed weights', x: 200, y: 90, w: 160, status: 'active' },
  { id: 'post', label: 'Postprocess', detail: '(1, 10) → label', x: 200, y: 180, w: 160 },
  { id: 'resp', label: 'Response', detail: '{"label": 7}', x: 0, y: 180, w: 150 },
];

export const requestEdges: FlowEdge[] = [
  { from: 'client', to: 'pre' },
  { from: 'pre', to: 'model' },
  { from: 'model', to: 'post' },
  { from: 'post', to: 'resp' },
  { from: 'resp', to: 'client' },
];

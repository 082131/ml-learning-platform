// Code for "PyTorch tensors and autograd". PyTorch does not run in the browser. Every output shown was
// recorded by running the code with PyTorch 2.14.1 on CPU (CPython 3.13); content/tracks/python/
// python-outputs.test.ts re-runs it when TORCH_PYTHON points to a Python with torch. The shape explorer was
// recorded by src/lib/pycourse/fixtures/torch_shapes.py.
import { lineOf, span } from '@/lib/foundations/annotate';
import { recordedExperiment, recordedSlots, type RecordedFixture } from '@/lib/pycourse/recorded';
import fixture from '@/lib/pycourse/fixtures/torch_shapes.json';
import type { CodeExample } from '@/lib/types';

const shapes = fixture as RecordedFixture;
const SRC = shapes.template;

export const recordedNote = 'Recorded with PyTorch 2.14.1 on CPU. PyTorch does not run in your browser.';

export const experiment = recordedExperiment('py-torch-shapes', shapes, 'Operation');

export const shapesCode: CodeExample = {
  id: 'py-torch-shapes-code',
  language: 'python',
  source: SRC,
  slots: recordedSlots(shapes),
  annotations: [
    {
      id: 'x',
      ...span(SRC, 3, 'torch.arange(6, dtype=torch.float32).reshape(2, 3)'),
      kind: 'framework',
      title: 'A (2, 3) float32 tensor',
      what: '0, 1, …, 5 arranged as 2 rows of 3, stored as 32-bit floats.',
      why: 'float32 is what models use; torch.arange alone would give int64.',
      output: 'tensor([[0., 1., 2.], [3., 4., 5.]])',
    },
    {
      id: 'w',
      ...span(SRC, 4, 'torch.ones(3, 4)'),
      kind: 'framework',
      title: 'A (3, 4) tensor of ones',
      what: 'Shaped like a weight matrix that maps 3 features to 4 outputs.',
      why: 'x @ w is (2, 3) @ (3, 4): the inner sizes match, so the result is (2, 4).',
    },
    {
      id: 'op',
      ...span(SRC, 5, '{{op}}'),
      kind: 'framework',
      title: 'The operation',
      what: 'Shape rules follow NumPy: matmul needs matching inner sizes; broadcasting aligns shapes from the right; dim= is NumPy’s axis=.',
      why: 'Most PyTorch bugs are shape bugs. Predict the shape before you run.',
      inputs: 'the operation chosen above',
    },
  ],
};

const AUTOGRAD = `import torch

w = torch.tensor(2.0, requires_grad=True)
b = torch.tensor(0.5, requires_grad=True)
x, y = torch.tensor(3.0), torch.tensor(10.0)

pred = w * x + b                 # 6.5
loss = (pred - y) ** 2           # (6.5 - 10)^2 = 12.25
loss.backward()                  # fills w.grad and b.grad
print(loss.item(), w.grad.item(), b.grad.item())   # dL/dw = 2(pred-y)x, dL/db = 2(pred-y)

loss = ((w * x + b) - y) ** 2
loss.backward()                  # gradients ADD to the old ones
print(w.grad.item())

with torch.no_grad():            # no graph: for updates and evaluation
    w -= 0.01 * w.grad           # one gradient-descent step with the accumulated -42
    frozen = w * x
w.grad.zero_(); b.grad.zero_()   # what optimizer.zero_grad() does
print(round(w.item(), 2), frozen.requires_grad, w.grad.item(), pred.grad_fn is not None)`;

/** requires_grad, backward, accumulation, zeroing and no_grad on a one-weight model. */
export const autogradCode: CodeExample = {
  id: 'py-torch-autograd',
  language: 'python',
  source: AUTOGRAD,
  annotations: [
    {
      id: 'rg',
      ...span(AUTOGRAD, 3, 'requires_grad=True'),
      kind: 'parameter',
      title: 'requires_grad=True',
      what: 'Tells autograd to record every operation that uses w, so it can compute dloss/dw later.',
      why: 'Model parameters have it set automatically; input data does not need it.',
    },
    {
      id: 'backward',
      ...span(AUTOGRAD, lineOf(AUTOGRAD, 'loss.backward()'), 'loss.backward()'),
      kind: 'framework',
      title: 'backward()',
      what: 'Walks the recorded graph from loss back to w and b with the chain rule and stores the results in w.grad and b.grad.',
      why: 'dL/dw = 2(pred − y)·x = 2 × (−3.5) × 3 = −21 and dL/db = 2(pred − y) = −7, matching the printout.',
    },
    {
      id: 'accumulate',
      ...span(AUTOGRAD, lineOf(AUTOGRAD, 'gradients ADD'), 'loss.backward()'),
      kind: 'framework',
      title: 'Gradients accumulate',
      what: 'A second backward adds −21 to the stored −21, giving −42.',
      why: 'That is why every training step starts with optimizer.zero_grad().',
    },
    {
      id: 'nograd',
      ...span(AUTOGRAD, lineOf(AUTOGRAD, 'torch.no_grad()'), 'torch.no_grad()'),
      kind: 'framework',
      title: 'torch.no_grad()',
      what: 'Operations inside are not recorded: no graph, less memory, and results with requires_grad False.',
      why: 'Use it for parameter updates written by hand and for evaluation.',
    },
  ],
  expectedOutput: `12.25 -21.0 -7.0
-42.0
2.42 False 0.0 True`,
};

/** NumPy to tensor and back, dtype, and choosing a device. */
export const interopCode: CodeExample = {
  id: 'py-torch-interop',
  language: 'python',
  source: `import numpy as np
import torch

arr = np.array([[1.0, 2.0], [3.0, 4.0]])          # float64, as NumPy defaults
t = torch.from_numpy(arr)                          # shares memory with arr
arr[0, 0] = 100.0
print(t[0, 0].item(), t.dtype)

t32 = torch.tensor(arr, dtype=torch.float32)       # a copy, in the dtype models use
print(t32.dtype, t32.device, tuple(t32.shape))

out = (t32 * 2).sum(dim=1)
print(out, out.numpy())

device = "cuda" if torch.cuda.is_available() else "cpu"
print(device, t32.to(device).device.type)`,
  annotations: [],
  expectedOutput: `100.0 torch.float64
torch.float32 cpu (2, 2)
tensor([204.,  14.]) [204.  14.]
cpu cpu`,
};

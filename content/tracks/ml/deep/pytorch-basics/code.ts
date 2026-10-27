// Code for the pytorch-basics lesson. tiny_net.py (src/lib/deep/fixtures) is shown exactly as it was run
// with PyTorch 2.14.1 on CPU (CPython 3.13); its printed output and the values in the simulated trace were
// recorded from that run by gen_tiny_net.py. Nothing PyTorch runs in the browser. The TypeScript twin runs
// live and is tested to reproduce the recorded numbers (src/lib/deep/tinyNet.test.ts).
import {
  buildTorchTrace,
  tinyNetExperiment,
  TORCH_RECORD,
  TORCH_SOURCE,
  type TinyState,
} from '@/lib/deep/tinyNet';
import type { CodeExample } from '@/lib/types';

/** The values recorded from the PyTorch run, as a step-through (labeled Simulated trace). */
export const torchTrace = buildTorchTrace();
export const recordedNote =
  'Values recorded from a run of PyTorch 2.14.1 on CPU; nothing runs in your browser.';

export const experiment = tinyNetExperiment('tiny-net');

const st = (s: unknown) => s as TinyState;

export const torchCode: CodeExample = {
  id: 'pytorch-tiny-net',
  language: 'python',
  source: TORCH_SOURCE,
  annotations: [
    {
      id: 'nn',
      range: { line: 2, startCol: 18, endCol: 20 },
      match: 'nn',
      kind: 'framework',
      title: 'torch.nn',
      what: 'PyTorch’s neural-network package: layers, activations and losses.',
      why: 'Everything model-shaped in this file comes from nn.',
    },
    {
      id: 'module',
      range: { line: 5, startCol: 14, endCol: 23 },
      match: 'nn.Module',
      kind: 'framework',
      title: 'nn.Module',
      what: 'The base class of every PyTorch layer and model.',
      why: 'Subclassing it lets PyTorch find every parameter assigned as an attribute (self.hidden, self.out), move them to a device, and save them.',
    },
    {
      id: 'super',
      range: { line: 7, startCol: 8, endCol: 26 },
      match: 'super().__init__()',
      kind: 'syntax',
      title: 'super().__init__()',
      what: 'Runs nn.Module’s own setup first.',
      why: 'Without it, assigning self.hidden raises an AttributeError: the module has not created its registry of layers yet.',
    },
    {
      id: 'linear1',
      range: { line: 8, startCol: 22, endCol: 37 },
      match: 'nn.Linear(2, 3)',
      kind: 'framework',
      title: 'nn.Linear(in_features=2, out_features=3)',
      what: 'A dense layer computing y = x @ weight.T + bias. It stores weight with shape (3, 2), (out, in), and bias with shape (3,).',
      why: 'The transposed layout is PyTorch’s convention; our earlier lessons wrote W as (in, out) and computed X @ W + b. Same numbers, transposed.',
      inputs: 'x: (batch, 2)',
      output: '(batch, 3)',
    },
    {
      id: 'linear2',
      range: { line: 9, startCol: 19, endCol: 34 },
      match: 'nn.Linear(3, 1)',
      kind: 'framework',
      title: 'nn.Linear(3, 1)',
      what: 'The output layer: weight (1, 3), bias (1,).',
      why: 'One output per example: the logit of the probability of class 1.',
      inputs: '(batch, 3)',
      output: '(batch, 1)',
    },
    {
      id: 'forward',
      range: { line: 11, startCol: 4, endCol: 25 },
      match: 'def forward(self, x):',
      kind: 'function',
      title: 'forward(self, x)',
      what: 'Defines what the model computes. You call model(X), not model.forward(X).',
      why: 'model(X) runs forward plus PyTorch’s hooks; autograd records every operation inside it.',
    },
    {
      id: 'tanh',
      range: { line: 12, startCol: 12, endCol: 38 },
      match: 'torch.tanh(self.hidden(x))',
      kind: 'math',
      title: 'tanh(hidden(x))',
      what: 'The hidden layer and its activation.',
      why: 'Without a nonlinearity, two Linear layers would collapse into one linear map, which cannot fit XOR.',
      output: 'h: (batch, 3)',
    },
    {
      id: 'sigmoid',
      range: { line: 13, startCol: 15, endCol: 41 },
      match: 'torch.sigmoid(self.out(h))',
      kind: 'math',
      title: 'sigmoid(out(h))',
      what: 'Squashes the output into a probability between 0 and 1.',
      why: 'nn.BCELoss expects probabilities.',
      output: '(batch, 1)',
    },
    {
      id: 'model',
      range: { line: 16, startCol: 8, endCol: 17 },
      match: 'TinyNet()',
      kind: 'function',
      title: 'TinyNet()',
      what: 'Creates the model with randomly initialized weights.',
      why: 'The next block overwrites them with fixed values so that you can check every number.',
    },
    {
      id: 'no-grad',
      range: { line: 17, startCol: 5, endCol: 20 },
      match: 'torch.no_grad()',
      kind: 'framework',
      title: 'torch.no_grad()',
      what: 'A context in which autograd records nothing.',
      why: 'Editing parameters in place is not part of the model’s computation; outside no_grad PyTorch refuses an in-place change to a leaf tensor that requires grad. Also used for evaluation, where it saves memory.',
    },
    {
      id: 'weight',
      range: { line: 18, startCol: 4, endCol: 23 },
      match: 'model.hidden.weight',
      kind: 'variable',
      title: 'model.hidden.weight',
      what: 'The hidden layer’s weight parameter, shape (3, 2).',
      why: 'Row j holds the two input weights of hidden unit j.',
    },
    {
      id: 'copy',
      range: { line: 18, startCol: 24, endCol: 29 },
      match: 'copy_',
      kind: 'framework',
      title: 'copy_',
      what: 'Copies values into the existing tensor in place (the trailing _ means in place).',
      why: 'Keeps the same Parameter object the optimizer will hold.',
    },
    {
      id: 'tensor',
      range: { line: 23, startCol: 4, endCol: 16 },
      match: 'torch.tensor',
      kind: 'framework',
      title: 'torch.tensor',
      what: 'Builds a tensor from nested lists. Python floats become float32 by default.',
      why: 'X has shape (4, 2): the four XOR inputs.',
    },
    {
      id: 'bce',
      range: { line: 25, startCol: 10, endCol: 22 },
      match: 'nn.BCELoss()',
      kind: 'framework',
      title: 'nn.BCELoss()',
      what: 'Binary cross-entropy, averaged over all entries (reduction="mean").',
      why: 'The loss for yes/no labels with probability outputs.',
    },
    {
      id: 'sgd',
      range: { line: 26, startCol: 12, endCol: 27 },
      match: 'torch.optim.SGD',
      kind: 'framework',
      title: 'torch.optim.SGD',
      what: 'Plain SGD: parameter −= lr · parameter.grad on step().',
      why: 'The optimizer from the previous lessons.',
    },
    {
      id: 'params',
      range: { line: 26, startCol: 28, endCol: 46 },
      match: 'model.parameters()',
      kind: 'framework',
      title: 'model.parameters()',
      what: 'All four parameter tensors: hidden.weight, hidden.bias, out.weight, out.bias.',
      why: 'nn.Module found them because they were assigned as attributes in __init__.',
    },
    {
      id: 'zero',
      range: { line: 29, startCol: 4, endCol: 25 },
      match: 'optimizer.zero_grad()',
      kind: 'framework',
      title: 'optimizer.zero_grad()',
      what: 'Resets every parameter’s .grad (to None by default).',
      why: 'backward() adds to .grad. Without this, each step would use the sum of all past gradients.',
    },
    {
      id: 'call',
      range: { line: 30, startCol: 12, endCol: 20 },
      match: 'model(X)',
      kind: 'function',
      title: 'model(X)',
      what: 'The forward pass on the whole batch.',
      why: 'Autograd records the operations so backward() can apply the chain rule.',
      output: 'y_hat: (4, 1)',
    },
    {
      id: 'loss',
      range: { line: 31, startCol: 11, endCol: 28 },
      match: 'loss_fn(y_hat, y)',
      kind: 'function',
      title: 'loss_fn(y_hat, y)',
      what: 'The mean BCE over the 4 predictions.',
      why: 'A scalar tensor: backward() starts from it.',
      output: 'shape () (a 0-dimensional tensor)',
    },
    {
      id: 'backward',
      range: { line: 32, startCol: 4, endCol: 19 },
      match: 'loss.backward()',
      kind: 'framework',
      title: 'loss.backward()',
      what: 'Backpropagation: fills param.grad with ∂loss/∂param for every parameter.',
      why: 'This replaces the hand-written backward pass of the earlier lessons.',
    },
    {
      id: 'step',
      range: { line: 33, startCol: 4, endCol: 20 },
      match: 'optimizer.step()',
      kind: 'framework',
      title: 'optimizer.step()',
      what: 'Updates every parameter in place from its .grad.',
      why: 'One iteration of the training loop.',
    },
    {
      id: 'item',
      range: { line: 34, startCol: 22, endCol: 33 },
      match: 'loss.item()',
      kind: 'framework',
      title: 'loss.item()',
      what: 'The value of a one-element tensor as a Python float.',
      why: 'For printing and logging; it detaches the number from the graph.',
    },
    {
      id: 'squeeze',
      range: { line: 37, startCol: 19, endCol: 29 },
      match: 'squeeze(1)',
      kind: 'framework',
      title: 'squeeze(1)',
      what: 'Removes dimension 1 of size 1: (4, 1) becomes (4,).',
      why: 'Prints the four probabilities on one line.',
    },
  ],
  expectedOutput: TORCH_RECORD.printed.trimEnd(),
};

export const tsCode: CodeExample = {
  id: 'pytorch-ts-twin',
  language: 'typescript',
  source: `const net0: Network = [
  // hidden: W = hidden.weight.T, shape (2, 3)
  { W: [[0.5, 0.8, -0.4], [-0.3, 0.2, 0.6]], b: [0.1, -0.1, 0.0], activation: 'tanh' },
  // out: W = out.weight.T, shape (3, 1)
  { W: [[0.7], [-0.5], [0.3]], b: [0.05], activation: 'sigmoid' },
];
const X = [[0, 0], [0, 1], [1, 0], [1, 1]];
const y = [[0], [1], [1], [0]];

let net = net0;
for (let step = 0; step < {{steps}}; step++) {
  const { loss, grads } = lossAndGrads(net, X, y, 'bce');
  net = sgdStep(net, grads, {{lr}});
  console.log(step, loss);
}
console.log(predict(net, X));`,
  slots: { steps: (s) => String(st(s).steps), lr: (s) => String(st(s).lr) },
  annotations: [
    {
      id: 'w1',
      range: { line: 3, startCol: 7, endCol: 43 },
      match: '[[0.5, 0.8, -0.4], [-0.3, 0.2, 0.6]]',
      kind: 'variable',
      title: 'hidden.weight.T',
      what: 'PyTorch’s hidden.weight [[0.5, −0.3], [0.8, 0.2], [−0.4, 0.6]], transposed to (in, out) = (2, 3).',
      why: 'Our helper computes X @ W + b, PyTorch computes X @ weight.T + bias: storing weight.T makes them the same.',
    },
    {
      id: 'w2',
      range: { line: 5, startCol: 7, endCol: 29 },
      match: '[[0.7], [-0.5], [0.3]]',
      kind: 'variable',
      title: 'out.weight.T',
      what: 'out.weight [[0.7, −0.5, 0.3]] has shape (1, 3); transposed it is (3, 1).',
      why: 'Same reason: (in, out) layout.',
    },
    {
      id: 'steps',
      range: { line: 11, startCol: 19, endCol: 35 },
      match: 'step < {{steps}}',
      kind: 'parameter',
      title: 'Training steps',
      what: 'How many updates to make. Filled from the slider.',
      why: 'The PyTorch run was recorded with 3.',
    },
    {
      id: 'lag',
      range: { line: 12, startCol: 26, endCol: 56 },
      match: "lossAndGrads(net, X, y, 'bce')",
      kind: 'function',
      title: 'lossAndGrads',
      what: 'Forward pass, mean BCE and backpropagation in one call.',
      why: 'It does what model(X), loss_fn(y_hat, y) and loss.backward() do together. Gradients are returned instead of stored in .grad, so there is nothing to zero.',
    },
    {
      id: 'sgdstep',
      range: { line: 13, startCol: 8, endCol: 35 },
      match: 'sgdStep(net, grads, {{lr}})',
      kind: 'function',
      title: 'sgdStep',
      what: 'θ ← θ − lr·gradient, returning a new network.',
      why: 'optimizer.step() for torch.optim.SGD.',
    },
    {
      id: 'predict',
      range: { line: 16, startCol: 12, endCol: 27 },
      match: 'predict(net, X)',
      kind: 'function',
      title: 'predict',
      what: 'A forward pass without gradients.',
      why: 'Like model(X) under torch.no_grad().',
    },
  ],
};

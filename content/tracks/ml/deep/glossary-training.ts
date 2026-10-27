import type { GlossaryTerm } from '@/lib/types';

// ml/deep glossary terms taught in the training lessons (merged by ./glossary.ts).
export default [
  {
    id: 'optimizer',
    term: 'Optimizer',
    short: 'The rule that turns gradients into parameter updates, for example SGD, momentum or Adam.',
    long: 'Every optimizer starts from the gradient of the loss. Plain gradient descent subtracts it times a learning rate; momentum and Adam also keep running averages of past gradients and use them to choose the step.',
    introducedIn: 'ml/deep/optimizers',
  },
  {
    id: 'sgd',
    term: 'Stochastic gradient descent (SGD)',
    short:
      'Gradient descent where each step uses the gradient of a small random batch of examples instead of the whole dataset.',
    long: 'The batch gradient is a noisy estimate of the full gradient, so steps are cheap but jittery. In PyTorch, torch.optim.SGD implements the update θ ← θ − η·g (optionally with momentum) for whatever gradient you give it.',
    introducedIn: 'ml/deep/optimizers',
    aliases: ['stochastic gradient descent', 'mini-batch gradient descent'],
  },
  {
    id: 'momentum',
    term: 'Momentum',
    short:
      'An optimizer that steps along a running sum of past gradients (a velocity) instead of the current gradient alone.',
    long: 'With coefficient β (often 0.9), u ← β·u + g and θ ← θ − η·u. Directions where gradients agree build up speed; directions where they flip sign partly cancel.',
    introducedIn: 'ml/deep/optimizers',
  },
  {
    id: 'adam',
    term: 'Adam',
    short:
      'An optimizer that scales each parameter’s step by running averages of its gradient (m) and squared gradient (v).',
    long: 'Adam (adaptive moment estimation, Kingma and Ba, 2015) divides the bias-corrected mean gradient by the root of the bias-corrected mean squared gradient, so every coordinate moves roughly η per step whatever its steepness. PyTorch defaults: η = 0.001, β₁ = 0.9, β₂ = 0.999, ε = 1e-8.',
    introducedIn: 'ml/deep/optimizers',
  },
  {
    id: 'bias-correction',
    term: 'Bias correction (Adam)',
    short:
      'Dividing Adam’s running averages by 1 − βᵗ, which undoes their pull towards the zero they started at.',
    introducedIn: 'ml/deep/optimizers',
  },
  {
    id: 'mini-batch',
    term: 'Mini-batch',
    short: 'A small group of training examples used together for one gradient step.',
    long: 'The batch size B is how many examples it holds. B = 1 is pure stochastic gradient descent; B = the whole training set is full-batch gradient descent.',
    introducedIn: 'ml/deep/training-loop',
    aliases: ['batch size'],
  },
  {
    id: 'epoch',
    term: 'Epoch',
    short: 'One full pass over the training set: every training example is used once.',
    long: 'With N training examples and batch size B, an epoch takes ceil(N / B) iterations; the last batch is smaller when B does not divide N.',
    introducedIn: 'ml/deep/training-loop',
  },
  {
    id: 'iteration',
    term: 'Iteration (training step)',
    short: 'One forward pass, backward pass and parameter update on one mini-batch.',
    introducedIn: 'ml/deep/training-loop',
    aliases: ['training step'],
  },
  {
    id: 'loss-curve',
    term: 'Loss curve',
    short: 'A plot of the loss against iterations or epochs, usually for both training and validation data.',
    introducedIn: 'ml/deep/training-loop',
    aliases: ['learning curve'],
  },
  {
    id: 'pytorch',
    term: 'PyTorch',
    short:
      'An open-source Python library for tensors on CPUs and GPUs, automatic differentiation and neural networks.',
    introducedIn: 'ml/deep/pytorch-basics',
    aliases: ['torch'],
  },
  {
    id: 'autograd',
    term: 'Autograd',
    short:
      'PyTorch’s automatic differentiation: it records operations on tensors and computes gradients by backpropagation when you call backward().',
    introducedIn: 'ml/deep/pytorch-basics',
  },
  {
    id: 'nn-module',
    term: 'nn.Module',
    short: 'The PyTorch base class for layers and models: it holds parameters and defines forward().',
    introducedIn: 'ml/deep/pytorch-basics',
  },
] satisfies GlossaryTerm[];

import type { GlossaryTerm } from '@/lib/types';

// ml/deep glossary terms taught in the networks lessons (merged by ./glossary.ts).
export default [
  {
    id: 'neuron',
    term: 'Neuron (unit)',
    short:
      'The basic unit of a neural network: it multiplies its inputs by weights, adds a bias to get z = w·x + b, and outputs a = f(z) for an activation function f.',
    long: 'A single sigmoid neuron is exactly logistic regression. Networks get their power from many neurons arranged in layers.',
    introducedIn: 'ml/deep/neurons-activations',
    aliases: ['unit', 'artificial neuron', 'perceptron'],
  },
  {
    id: 'pre-activation',
    term: 'Pre-activation (z)',
    short: 'The weighted sum z = w·x + b a neuron computes before its activation function is applied.',
    introducedIn: 'ml/deep/neurons-activations',
    aliases: ['weighted sum'],
  },
  {
    id: 'activation-function',
    term: 'Activation function',
    short:
      'A non-linear function f applied to a neuron’s weighted sum z, such as sigmoid, tanh or ReLU. Without it, stacked layers collapse into one linear map.',
    introducedIn: 'ml/deep/neurons-activations',
    aliases: ['activation', 'non-linearity'],
  },
  {
    id: 'relu',
    term: 'ReLU (rectified linear unit)',
    short:
      'The activation ReLU(z) = max(0, z): negative values become 0, positive values pass through unchanged.',
    long: 'Its slope is 1 for z > 0 and 0 for z < 0 (libraries use 0 at z = 0). It is the usual default for hidden layers.',
    introducedIn: 'ml/deep/neurons-activations',
    aliases: ['rectified linear unit'],
  },
  {
    id: 'tanh',
    term: 'Tanh (hyperbolic tangent)',
    short:
      'The activation tanh(z) = (e^z − e^(−z)) / (e^z + e^(−z)): an S-shaped curve from −1 to 1, centered at 0.',
    long: 'tanh(z) = 2σ(2z) − 1, a stretched and shifted sigmoid. Its slope is 1 − tanh(z)².',
    introducedIn: 'ml/deep/neurons-activations',
    aliases: ['hyperbolic tangent'],
  },
  {
    id: 'neural-network',
    term: 'Neural network',
    short:
      'A function built from layers of neurons, where each layer’s outputs are the next layer’s inputs. Called a multilayer perceptron (MLP) when every layer is dense.',
    introducedIn: 'ml/deep/neurons-activations',
    aliases: ['MLP', 'multilayer perceptron', 'network'],
  },
  {
    id: 'dense-layer',
    term: 'Dense layer',
    short:
      'A layer in which every output is connected to every input: Z = X @ W + b, then A = f(Z). X is (batch, in), W is (in, out), b is (out,).',
    long: 'PyTorch calls it nn.Linear and stores W transposed, as (out, in).',
    introducedIn: 'ml/deep/forward-propagation',
    aliases: ['fully connected layer', 'linear layer'],
  },
  {
    id: 'hidden-layer',
    term: 'Hidden layer',
    short:
      'Any layer between the input and the output layer. Its values are not given by the data or the targets.',
    introducedIn: 'ml/deep/forward-propagation',
  },
  {
    id: 'forward-propagation',
    term: 'Forward propagation (forward pass)',
    short:
      'Running inputs through a network layer by layer, Z = A_prev @ W + b and A = f(Z), until the output layer gives the prediction.',
    introducedIn: 'ml/deep/forward-propagation',
    aliases: ['forward pass'],
  },
  {
    id: 'backpropagation',
    term: 'Backpropagation',
    short:
      'The algorithm that computes the gradient of the loss with respect to every weight and bias, by applying the chain rule layer by layer from the output back to the input.',
    introducedIn: 'ml/deep/backpropagation',
    aliases: ['backprop', 'backward pass'],
  },
  {
    id: 'gradient-check',
    term: 'Gradient check',
    short:
      'Comparing backpropagation’s gradients with numerical estimates (L(θ + ε) − L(θ − ε)) / 2ε. A relative error around 1e-7 or below means the backward pass is right.',
    introducedIn: 'ml/deep/backpropagation',
    aliases: ['numerical gradient check'],
  },
] satisfies GlossaryTerm[];

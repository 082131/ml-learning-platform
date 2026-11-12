import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'n-batches',
    type: 'numeric',
    prompt:
      'A Dataset has 1,000 examples. How many batches does `DataLoader(ds, batch_size=64)` give per epoch?',
    answer: 16,
    tolerance: 0,
    hint: '1000 / 64 = 15.6; the remainder still forms a batch unless drop_last=True.',
    explain: '15 full batches of 64 (960 examples) plus one batch of 40: 16 in total.',
  },
  {
    id: 'params',
    type: 'numeric',
    prompt: 'How many trainable parameters does `nn.Linear(10, 5)` have?',
    answer: 55,
    tolerance: 0,
    hint: 'A weight matrix of shape (5, 10) plus one bias per output.',
    explain: '5 × 10 = 50 weights and 5 biases make 55.',
  },
  {
    id: 'super',
    type: 'choice',
    prompt: 'In a `class Net(nn.Module)`, what does `super().__init__()` do, and why must it come first?',
    options: [
      {
        text: 'It calls forward once to build the graph',
        correct: false,
        explain: 'Nothing is computed at construction time; graphs are built when the model runs.',
      },
      {
        text: 'It sets up the registry that layers are added to',
        correct: true,
        explain:
          'nn.Module tracks parameters and submodules assigned as attributes, and that bookkeeping exists only after its __init__ ran.',
      },
      {
        text: 'It moves the model to the GPU if one exists',
        correct: false,
        explain: 'Device placement is always explicit: model.to(device).',
      },
      {
        text: 'It initializes the weights to zero',
        correct: false,
        explain: 'Each layer initializes its own weights (randomly) in its own constructor.',
      },
    ],
  },
  {
    id: 'standardize',
    type: 'choice',
    prompt: 'Which statistics should standardize the validation features?',
    options: [
      {
        text: 'The validation set’s own mean and std',
        correct: false,
        explain:
          'Then train and validation features are on different scales, and the model sees inputs it was not trained on.',
      },
      {
        text: 'The mean and std of train and validation combined',
        correct: false,
        explain: 'That leaks information about the validation set into the training inputs.',
      },
      {
        text: 'The training set’s mean and std',
        correct: true,
        explain:
          'Fit preprocessing on training data only, then apply the same numbers everywhere, as a deployed model would.',
      },
    ],
  },
  {
    id: 'forward-call',
    type: 'choice',
    prompt: 'Why do you write `model(x)` rather than `model.forward(x)`?',
    options: [
      {
        text: 'They are identical; model(x) is just shorter',
        correct: false,
        explain: 'Not quite: calling the module runs hooks and bookkeeping around forward.',
      },
      {
        text: 'model(x) runs nn.Module’s __call__, which wraps forward with hooks',
        correct: true,
        explain: 'Calling forward directly skips registered hooks, which some tools and libraries rely on.',
      },
      {
        text: 'forward can only be called during training',
        correct: false,
        explain: 'forward runs in both modes; train() and eval() only change layer behavior.',
      },
    ],
  },
];

export const scaleExercise: Exercise = {
  id: 'py-torch-standardize-split',
  prompt:
    'Write standardize_split(X_train, X_val) that scales both with the training columns’ mean and std (NumPy arrays).',
  starter: `import numpy as np

def standardize_split(X_train, X_val):
    scale = lambda X: (X - X.mean(axis=0)) / X.std(axis=0)
    return scale(X_train), scale(X_val)         # bug: val uses its own statistics`,
  hints: [
    'Compute mean and std once, from X_train, with axis=0.',
    'Apply the same mean and std to both arrays.',
  ],
  solution: `import numpy as np

def standardize_split(X_train, X_val):
    mean = X_train.mean(axis=0)
    std = X_train.std(axis=0)
    return (X_train - mean) / std, (X_val - mean) / std`,
  explanation:
    'The validation set must be transformed exactly as unseen production data would be: with numbers learned from training data only.',
  tests: `import numpy as np
X_train = np.array([[0.0, 10.0], [2.0, 30.0]])
X_val = np.array([[4.0, 50.0]])
tr, va = standardize_split(X_train, X_val)
assert np.allclose(tr, [[-1, -1], [1, 1]]), tr
assert np.allclose(va, [[3, 3]]), va`,
};

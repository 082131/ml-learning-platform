// Code for "Datasets, DataLoaders and nn.Module". PyTorch does not run in the browser: every output shown was
// recorded with PyTorch 2.14.1 on CPU (CPython 3.13, pandas 3.1); content/tracks/python/python-outputs.test.ts
// re-runs it when TORCH_PYTHON is set. The loader explorer was recorded by
// src/lib/pycourse/fixtures/torch_loader.py.
import { lineOf, span } from '@/lib/foundations/annotate';
import { recordedExperiment, recordedSlots, type RecordedFixture } from '@/lib/pycourse/recorded';
import fixture from '@/lib/pycourse/fixtures/torch_loader.json';
import type { CodeExample } from '@/lib/types';

const loader = fixture as RecordedFixture;
const SRC = loader.template;

export const recordedNote = 'Recorded with PyTorch 2.14.1 on CPU. PyTorch does not run in your browser.';

export const experiment = recordedExperiment('py-torch-loader', loader, 'Loader and model settings');

export const loaderCode: CodeExample = {
  id: 'py-torch-loader-code',
  language: 'python',
  source: SRC,
  slots: recordedSlots(loader),
  annotations: [
    {
      id: 'seed',
      ...span(SRC, 5, 'torch.manual_seed(0)'),
      kind: 'framework',
      title: 'torch.manual_seed',
      what: 'Seeds PyTorch’s generator, which drives randn, randint, the shuffle order and the initial weights.',
      why: 'NumPy’s seed does not affect PyTorch; each library has its own generator.',
    },
    {
      id: 'tds',
      ...span(SRC, 8, 'TensorDataset(X, y)'),
      kind: 'framework',
      title: 'TensorDataset',
      what: 'A ready-made Dataset over tensors with the same first dimension: item i is (X[i], y[i]).',
      why: 'For data that already fits in tensors, you do not need to write a Dataset class.',
    },
    {
      id: 'bs',
      ...span(SRC, 8, 'batch_size={{bs}}'),
      kind: 'parameter',
      title: 'batch_size',
      what: 'How many examples are stacked into each batch tensor.',
      why: 'The last batch is smaller when the dataset size is not a multiple of it.',
      inputs: 'the batch size chosen above',
    },
    {
      id: 'shuffle',
      ...span(SRC, 8, 'shuffle=True'),
      kind: 'parameter',
      title: 'shuffle=True',
      what: 'Draws a new random order of indices every epoch.',
      why: 'Training batches should be random mixes; validation loaders use shuffle=False.',
    },
    {
      id: 'drop',
      ...span(SRC, 8, 'drop_last={{drop}}'),
      kind: 'parameter',
      title: 'drop_last',
      what: 'If True, a final batch smaller than batch_size is skipped.',
      why: 'Useful when a layer needs equal batch sizes; it also means some examples are not seen in an epoch.',
      inputs: 'drop_last chosen above',
    },
    {
      id: 'model',
      ...span(SRC, 9, 'nn.Sequential(nn.Linear(4, {{hidden}}), nn.ReLU(), nn.Linear({{hidden}}, 3))'),
      kind: 'framework',
      title: 'A two-layer network',
      what: '4 features → hidden units → 3 class scores (logits). Each Linear has a weight matrix and a bias vector.',
      why: 'Its parameter count is (4·h + h) + (h·3 + 3).',
      inputs: 'the hidden size chosen above',
    },
    {
      id: 'loop',
      ...span(SRC, lineOf(SRC, 'for xb, yb in loader:'), 'for xb, yb in loader:'),
      kind: 'syntax',
      title: 'Iterating a DataLoader',
      what: 'Each step gives a batch of inputs (batch, 4) and labels (batch,).',
      why: 'The model maps (batch, 4) to (batch, 3): the batch dimension passes straight through.',
    },
  ],
};

/** A Dataset built from a pandas DataFrame, standardized with training statistics, and an nn.Module subclass. */
export const datasetCode: CodeExample = {
  id: 'py-torch-dataset-module',
  language: 'python',
  source: `import pandas as pd
import torch
from torch import nn
from torch.utils.data import DataLoader, Dataset

df = pd.DataFrame({
    "sessions": [3, 12, 7, 1, 15, 9, 4, 11],
    "minutes": [20.0, 95.0, 41.0, 5.0, 130.0, 60.0, 22.0, 88.0],
    "upgraded": [0, 1, 0, 0, 1, 1, 0, 1],
})
train_df, val_df = df.iloc[:6], df.iloc[6:]
FEATURES = ["sessions", "minutes"]
mean, std = train_df[FEATURES].mean(), train_df[FEATURES].std()   # training split only

class UsageDataset(Dataset):
    def __init__(self, frame):
        X = (frame[FEATURES] - mean) / std
        self.X = torch.tensor(X.to_numpy(), dtype=torch.float32)
        self.y = torch.tensor(frame["upgraded"].to_numpy(), dtype=torch.float32)

    def __len__(self):
        return len(self.y)

    def __getitem__(self, i):
        return self.X[i], self.y[i]

class Classifier(nn.Module):
    def __init__(self, n_features, hidden=8):
        super().__init__()
        self.net = nn.Sequential(nn.Linear(n_features, hidden), nn.ReLU(), nn.Linear(hidden, 1))

    def forward(self, x):
        return self.net(x).squeeze(1)          # (batch, 1) -> (batch,)

train_ds = UsageDataset(train_df)
print(len(train_ds), train_ds[0][0].round(decimals=3), train_ds[0][1])

torch.manual_seed(0)
model = Classifier(n_features=2)
print(model)
print(sum(p.numel() for p in model.parameters() if p.requires_grad))

xb, yb = next(iter(DataLoader(train_ds, batch_size=4, shuffle=False)))
print(tuple(xb.shape), tuple(model(xb).shape))`,
  annotations: [],
  expectedOutput: `6 tensor([-0.9110, -0.8170]) tensor(0.)
Classifier(
  (net): Sequential(
    (0): Linear(in_features=2, out_features=8, bias=True)
    (1): ReLU()
    (2): Linear(in_features=8, out_features=1, bias=True)
  )
)
33
(4, 2) (4,)`,
};

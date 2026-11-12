// Code for "The training loop, evaluation and debugging". PyTorch does not run in the browser: every output
// shown was recorded with PyTorch 2.14.1 on CPU (CPython 3.13); content/tracks/python/python-outputs.test.ts
// re-runs it when TORCH_PYTHON is set. The training explorer was recorded by
// src/lib/pycourse/fixtures/torch_train.py.
import { lineOf, span } from '@/lib/foundations/annotate';
import { recordedExperiment, recordedSlots, type RecordedFixture } from '@/lib/pycourse/recorded';
import fixture from '@/lib/pycourse/fixtures/torch_train.json';
import type { CodeExample } from '@/lib/types';

const train = fixture as RecordedFixture;
const SRC = train.template;
const at = (match: string) => span(SRC, lineOf(SRC, match), match);

export const recordedNote = 'Recorded with PyTorch 2.14.1 on CPU. PyTorch does not run in your browser.';

export const experiment = recordedExperiment('py-torch-train', train, 'Training settings');

export const trainCode: CodeExample = {
  id: 'py-torch-train-code',
  language: 'python',
  source: SRC,
  slots: recordedSlots(train),
  annotations: [
    {
      id: 'bs',
      ...at('batch_size={{bs}}'),
      kind: 'parameter',
      title: 'batch_size',
      what: 'Examples per optimizer step. 480 training rows at batch size 32 give 15 steps per epoch.',
      why: 'Smaller batches mean more (noisier) steps per epoch; one batch of all 480 rows means one step per epoch.',
      inputs: 'the batch size chosen above',
    },
    {
      id: 'lr',
      ...at('lr={{lr}}'),
      kind: 'parameter',
      title: 'Learning rate',
      what: 'How far each step moves the parameters along the negative gradient.',
      why: 'Too small and the loss barely moves in 20 epochs; too large and it jumps around instead of settling.',
      inputs: 'the learning rate chosen above',
    },
    {
      id: 'train-mode',
      ...at('model.train()'),
      kind: 'framework',
      title: 'model.train()',
      what: 'Puts layers such as dropout and batch norm in training mode.',
      why: 'This model has neither, so it changes nothing here, but the habit matters for models that do.',
    },
    {
      id: 'zero',
      ...at('{{zero}}'),
      kind: 'framework',
      title: 'opt.zero_grad()',
      what: 'Clears every parameter’s .grad before the next backward pass.',
      why: 'backward() adds to .grad. Without clearing it, each step uses the sum of all gradients so far.',
      inputs: 'the zero_grad choice above',
    },
    {
      id: 'backward',
      ...at('loss.backward()'),
      kind: 'framework',
      title: 'loss.backward()',
      what: 'Computes the gradient of the loss with respect to every parameter and adds it to p.grad.',
      why: 'The optimizer reads p.grad in the next line.',
    },
    {
      id: 'step',
      ...at('opt.step()'),
      kind: 'framework',
      title: 'opt.step()',
      what: 'Updates each parameter: for plain SGD, p -= lr * p.grad.',
      why: 'The order is always: forward, loss, zero_grad, backward, step.',
    },
    {
      id: 'item',
      ...at('loss.item()'),
      kind: 'framework',
      title: '.item()',
      what: 'Turns a one-element tensor into a Python float.',
      why: 'Summing the loss tensors instead would keep every step’s graph alive and slowly use up memory.',
    },
    {
      id: 'nograd',
      ...at('with torch.no_grad():'),
      kind: 'framework',
      title: 'Evaluation without gradients',
      what: 'model.eval() plus torch.no_grad(): inference mode for layers, and no graph recorded.',
      why: 'Validation should not change the model or cost the memory of a backward pass.',
    },
  ],
};

/** A complete loop with Adam, evaluation, best-checkpoint saving and restoring. */
export const loopCode: CodeExample = {
  id: 'py-torch-loop-checkpoint',
  language: 'python',
  source: `import torch
from torch import nn
from torch.utils.data import DataLoader, TensorDataset

torch.manual_seed(0)
X = torch.randn(600, 2)
y = (X.pow(2).sum(dim=1) < 1.4).float()
train_loader = DataLoader(TensorDataset(X[:480], y[:480]), batch_size=32, shuffle=True)
val_loader = DataLoader(TensorDataset(X[480:], y[480:]), batch_size=120)

model = nn.Sequential(nn.Linear(2, 16), nn.ReLU(), nn.Linear(16, 1))
loss_fn = nn.BCEWithLogitsLoss()
opt = torch.optim.Adam(model.parameters(), lr=0.01)

def train_one_epoch():
    model.train()                          # dropout and batch norm in training mode
    total, n = 0.0, 0
    for xb, yb in train_loader:
        loss = loss_fn(model(xb).squeeze(1), yb)
        opt.zero_grad()                    # clear the gradients of the previous step
        loss.backward()                    # fill p.grad for every parameter
        opt.step()                         # update the parameters with those gradients
        total += loss.item() * len(xb)     # .item(): a Python float, no graph kept
        n += len(xb)
    return total / n

@torch.no_grad()                           # no graph: faster and uses less memory
def evaluate():
    model.eval()
    total, correct, n = 0.0, 0, 0
    for xb, yb in val_loader:
        logits = model(xb).squeeze(1)
        total += loss_fn(logits, yb).item() * len(xb)
        correct += ((logits > 0).float() == yb).sum().item()
        n += len(xb)
    return total / n, correct / n

best = float("inf")
for epoch in range(1, 16):
    train_loss = train_one_epoch()
    val_loss, val_acc = evaluate()
    if val_loss < best:                    # keep the best model, not the last one
        best = val_loss
        torch.save({"epoch": epoch, "model": model.state_dict(), "opt": opt.state_dict()}, "checkpoint.pt")
    if epoch % 5 == 0:
        print(f"epoch {epoch}: train {train_loss:.3f}  val {val_loss:.3f}  acc {val_acc:.3f}")

ckpt = torch.load("checkpoint.pt")
restored = nn.Sequential(nn.Linear(2, 16), nn.ReLU(), nn.Linear(16, 1))
restored.load_state_dict(ckpt["model"])
restored.eval()
print("best epoch", ckpt["epoch"], "| keys:", list(ckpt["model"].keys())[:2])
with torch.no_grad():
    print(restored(torch.tensor([[0.0, 0.0], [2.0, 2.0]])).squeeze(1).sigmoid().round(decimals=3))`,
  annotations: [],
  expectedOutput: `epoch 5: train 0.413  val 0.388  acc 0.958
epoch 10: train 0.222  val 0.218  acc 0.950
epoch 15: train 0.154  val 0.158  acc 0.950
best epoch 15 | keys: ['0.weight', '0.bias']
tensor([0.9940, 0.0000])`,
};

/** Overfitting a single batch: a healthy model reaches near-zero loss, a buggy one gets stuck. */
export const overfitCode: CodeExample = {
  id: 'py-torch-overfit-batch',
  language: 'python',
  source: `import torch
from torch import nn

torch.manual_seed(0)
xb = torch.randn(8, 2)
yb = (xb.pow(2).sum(dim=1) < 1.4).float()

def overfit_one_batch(model, steps=300):
    opt = torch.optim.Adam(model.parameters(), lr=0.05)
    loss_fn = nn.BCEWithLogitsLoss()
    for step in range(steps + 1):
        loss = loss_fn(model(xb).squeeze(1), yb)
        opt.zero_grad()
        loss.backward()
        opt.step()
        if step % 100 == 0:
            print(f"  step {step:3d}  loss {loss.item():.4f}")

print("healthy model:")
overfit_one_batch(nn.Sequential(nn.Linear(2, 16), nn.ReLU(), nn.Linear(16, 1)))

print("model with a bug (ReLU on the output, so logits are never negative):")
overfit_one_batch(nn.Sequential(nn.Linear(2, 16), nn.ReLU(), nn.Linear(16, 1), nn.ReLU()))`,
  annotations: [],
  expectedOutput: `healthy model:
  step   0  loss 0.7052
  step 100  loss 0.0013
  step 200  loss 0.0005
  step 300  loss 0.0003
model with a bug (ReLU on the output, so logits are never negative):
  step   0  loss 0.7034
  step 100  loss 0.6931
  step 200  loss 0.6931
  step 300  loss 0.6931`,
};

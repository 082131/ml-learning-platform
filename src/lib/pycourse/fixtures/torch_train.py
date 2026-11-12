"""Recorded runs for python/pytorch/training-loop: train and validation loss per epoch for different learning
rates, batch sizes, and a loop that forgets zero_grad. Run with a Python that has torch 2.14 installed
(TORCH_PYTHON in the tests)."""
import math, pathlib, sys

import torch  # noqa: F401 (the template needs it; also marks this fixture as a PyTorch one for the tests)

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from _runner import run_fixture

TEMPLATE = '''import torch
from torch import nn
from torch.utils.data import DataLoader, TensorDataset

torch.manual_seed(0)
X = torch.randn(600, 2)
y = (X.pow(2).sum(dim=1) < 1.4).float()      # class 1 inside a circle
train_ds = TensorDataset(X[:480], y[:480])
X_val, y_val = X[480:], y[480:]
loader = DataLoader(train_ds, batch_size={{bs}}, shuffle=True)

model = nn.Sequential(nn.Linear(2, 16), nn.ReLU(), nn.Linear(16, 1))
loss_fn = nn.BCEWithLogitsLoss()
opt = torch.optim.SGD(model.parameters(), lr={{lr}})
history = []

for epoch in range(1, 21):
    model.train()
    total = 0.0
    for xb, yb in loader:
        logits = model(xb).squeeze(1)
        loss = loss_fn(logits, yb)
        {{zero}}
        loss.backward()
        opt.step()
        total += loss.item() * len(xb)
    model.eval()
    with torch.no_grad():
        val_logits = model(X_val).squeeze(1)
        val_loss = loss_fn(val_logits, y_val).item()
        val_acc = ((val_logits > 0).float() == y_val).float().mean().item()
    history.append((epoch, total / len(train_ds), val_loss, val_acc))
    if epoch in (1, 5, 10, 20):
        print(f"epoch {epoch:2d}  train {total / len(train_ds):.4f}  val {val_loss:.4f}  acc {val_acc:.3f}")'''

ZERO = "opt.zero_grad()"
FORGOT = "pass  # opt.zero_grad() forgotten"
CASES = [
    ("lr0.1-bs32", "0.1", "32", ZERO),
    ("lr0.01-bs32", "0.01", "32", ZERO),
    ("lr1-bs32", "1.0", "32", ZERO),
    ("lr10-bs32", "10.0", "32", ZERO),
    ("lr0.1-bs480", "0.1", "480", ZERO),
    ("lr0.1-bs8", "0.1", "8", ZERO),
    ("lr0.1-bs32-nozero", "0.1", "32", FORGOT),
]
VARIANTS = [
    {"id": i, "label": f"lr={lr}, batch_size={bs}" + (", zero_grad forgotten" if z == FORGOT else ""),
     "slots": {"lr": lr, "bs": bs, "zero": z}}
    for i, lr, bs, z in CASES
]


def fmt(v):
    return f"{v:.4f}" if math.isfinite(v) else str(v)


def cards(ns, error, variant):
    h = ns["history"]
    steps = 20 * len(ns["loader"])
    last = h[-1]
    best = min(h, key=lambda r: r[2])
    clean = lambda v: round(v, 4) if math.isfinite(v) else None
    return {
        "cards": [
            {"label": "optimizer steps", "value": str(steps), "note": f"20 epochs × {len(ns['loader'])} batches"},
            {"label": "final train loss", "value": fmt(last[1]), "note": "mean over the last epoch’s batches"},
            {"label": "final val loss", "value": fmt(last[2]), "note": f"lowest was {fmt(best[2])} at epoch {best[0]}"},
            {"label": "final val accuracy", "value": f"{last[3]:.3f}", "note": "about 0.5 is chance level here"},
        ],
        "curves": {
            "xLabel": "Epoch",
            "yLabel": "Loss",
            "series": [
                {"id": "train", "label": "Train loss", "points": [[r[0], clean(r[1])] for r in h]},
                {"id": "val", "label": "Validation loss", "points": [[r[0], clean(r[2])] for r in h]},
            ],
        },
    }


run_fixture(__file__, TEMPLATE, VARIANTS, cards)

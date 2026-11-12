"""Recorded runs for python/pytorch/datasets-modules: batch shapes from a DataLoader and a model's parameter
count. Run with a Python that has torch 2.14 installed (TORCH_PYTHON in the tests)."""
import pathlib, sys

import torch  # noqa: F401 (the template needs it; also marks this fixture as a PyTorch one for the tests)

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from _runner import run_fixture

TEMPLATE = '''import torch
from torch import nn
from torch.utils.data import DataLoader, TensorDataset

torch.manual_seed(0)
X = torch.randn(10, 4)                  # 10 examples, 4 features
y = torch.randint(0, 3, (10,))          # 3 classes
loader = DataLoader(TensorDataset(X, y), batch_size={{bs}}, shuffle=True, drop_last={{drop}})
model = nn.Sequential(nn.Linear(4, {{hidden}}), nn.ReLU(), nn.Linear({{hidden}}, 3))

for xb, yb in loader:
    logits = model(xb)
    print(tuple(xb.shape), tuple(yb.shape), "->", tuple(logits.shape))
print(sum(p.numel() for p in model.parameters()), "parameters")'''

CASES = [(4, False, 8), (4, True, 8), (3, False, 8), (10, False, 8), (16, True, 8), (4, False, 32)]
VARIANTS = [
    {"id": f"bs{b}-{'drop' if d else 'keep'}-h{h}",
     "label": f"batch_size={b}, drop_last={d}, hidden={h}",
     "slots": {"bs": str(b), "drop": str(d), "hidden": str(h)}}
    for b, d, h in CASES
]


def cards(ns, error, variant):
    b, d, h = int(variant["slots"]["bs"]), variant["slots"]["drop"] == "True", int(variant["slots"]["hidden"])
    n_batches = len(ns["loader"])
    seen = (10 // b) * b if d else 10
    return [
        {"label": "len(loader)", "value": str(n_batches), "note": f"batches per epoch; {seen} of 10 examples used"},
        {"label": "last batch", "value": "dropped" if d and 10 % b else (f"{10 % b} of {b}" if 10 % b else f"full ({b})"),
         "note": "drop_last=True discards a short final batch"},
        {"label": "parameters", "value": str(sum(p.numel() for p in ns["model"].parameters())),
         "note": f"(4·{h} + {h}) + ({h}·3 + 3): weights plus biases"},
    ]


run_fixture(__file__, TEMPLATE, VARIANTS, cards)

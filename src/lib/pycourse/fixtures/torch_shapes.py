"""Recorded runs for python/pytorch/tensors-autograd: result shapes (or errors) of common tensor operations.
Run with a Python that has torch 2.14 installed (TORCH_PYTHON in the tests)."""
import pathlib, sys

import torch  # noqa: F401 (the template needs it; also marks this fixture as a PyTorch one for the tests)

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from _runner import run_fixture

TEMPLATE = '''import torch

x = torch.arange(6, dtype=torch.float32).reshape(2, 3)   # shape (2, 3)
w = torch.ones(3, 4)                                      # shape (3, 4)
y = {{op}}
print(tuple(y.shape), y.dtype)'''

OPS = [
    ("matmul", "x @ w", "matrix product"),
    ("row-bcast", "x * torch.tensor([1.0, 10.0, 100.0])", "broadcast a (3,) row"),
    ("col-bcast", "x * torch.tensor([1.0, 10.0])", "broadcast a (2,) vector"),
    ("col-bcast-ok", "x * torch.tensor([[1.0], [10.0]])", "broadcast a (2, 1) column"),
    ("sum0", "x.sum(dim=0)", "sum over dim 0"),
    ("mean-keep", "x.mean(dim=1, keepdim=True)", "mean over dim 1, keepdim"),
    ("view", "x.view(3, 2)", "view as (3, 2)"),
    ("t-view", "x.T.view(6)", "view of a transpose"),
    ("t-reshape", "x.T.reshape(6)", "reshape of a transpose"),
    ("unsqueeze", "x.unsqueeze(0)", "add a batch dim"),
    ("stack", "torch.stack([x, x])", "stack two"),
    ("cat", "torch.cat([x, x], dim=1)", "concatenate on dim 1"),
    ("int-mix", "torch.arange(3) * 0.5", "int64 tensor times a float"),
    ("matmul-bad", "w @ x", "matmul, wrong order"),
]
VARIANTS = [{"id": i, "label": f"{op}  ({d})", "slots": {"op": op}} for i, op, d in OPS]


def cards(ns, error, variant):
    if error:
        return [{"label": "x.shape", "value": "(2, 3)", "note": "rows, columns"}]
    y = ns["y"]
    vals = y.flatten().tolist()
    shown = ", ".join(f"{v:g}" for v in vals[:8]) + (" …" if len(vals) > 8 else "")
    return [
        {"label": "y.shape", "value": str(tuple(y.shape)), "note": f"{y.dim()} dimensions, {y.numel()} elements"},
        {"label": "y values (flattened)", "value": shown, "note": f"dtype {str(y.dtype).replace('torch.', '')}"},
        {"label": "contiguous", "value": str(y.is_contiguous()), "note": "False means a strided view; .view() needs contiguous memory"},
    ]


run_fixture(__file__, TEMPLATE, VARIANTS, cards)

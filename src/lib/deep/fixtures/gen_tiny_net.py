"""Runs tiny_net.py (the pytorch-basics lesson's code) with PyTorch on CPU and records its printed output
and, at every line of the training loop, the values the lesson's simulated trace shows.
Usage: python gen_tiny_net.py tiny_net.json"""
import contextlib, io, json, platform, runpy, sys
from pathlib import Path

import torch

HERE = Path(__file__).parent
printed = io.StringIO()
with contextlib.redirect_stdout(printed):
    runpy.run_path(str(HERE / "tiny_net.py"), run_name="__main__")

# Replay the same loop step by step to record intermediate values (same code, same order).
model_src = (HERE / "tiny_net.py").read_text()
glb = {}
with contextlib.redirect_stdout(io.StringIO()):
    exec(model_src.split("for step in range(3):")[0], glb)
model, X, y, loss_fn, optimizer = glb["model"], glb["X"], glb["y"], glb["loss_fn"], glb["optimizer"]

def params():
    return {name: p.detach().tolist() for name, p in model.named_parameters()}

def grads():
    return {name: (None if p.grad is None else p.grad.tolist()) for name, p in model.named_parameters()}

steps = []
for step in range(3):
    before = params()
    optimizer.zero_grad()
    after_zero = grads()
    y_hat = model(X)
    loss = loss_fn(y_hat, y)
    loss.backward()
    g = grads()
    optimizer.step()
    steps.append({"step": step, "params_before": before, "grads_after_zero_grad": after_zero,
                  "y_hat": y_hat.detach().tolist(), "loss": loss.item(), "grads": g, "params_after": params()})
with torch.no_grad():
    final = model(X).squeeze(1).tolist()

json.dump({
    "torch": torch.__version__.split("+")[0], "python": platform.python_version(), "device": "cpu",
    "dtype": str(torch.get_default_dtype()), "printed": printed.getvalue(), "steps": steps, "final": final,
}, open(sys.argv[1], "w"), indent=1)

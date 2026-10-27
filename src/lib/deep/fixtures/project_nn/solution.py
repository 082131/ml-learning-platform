"""Reference solution for ml/deep/project-neural-net, run next to starter.py with CPython 3.13.16, NumPy 2.5.4,
scikit-learn 1.9.1 and PyTorch 2.14.1 (CPU). The figures quoted in the brief's last hint are what it printed."""
import numpy as np
import torch
from torch import nn
from starter import X_train, y_train, X_val, y_val, X_test, y_test, init_params, SEED

def forward(X, W1, b1, W2, b2):
    H = np.tanh(X @ W1 + b1)
    P = 1 / (1 + np.exp(-(H @ W2 + b2)))
    return H, P

def bce(P, y):
    P = np.clip(P, 1e-7, 1 - 1e-7)
    return float(-np.mean(y * np.log(P) + (1 - y) * np.log(1 - P)))

def loss_and_grads(X, y, W1, b1, W2, b2):
    H, P = forward(X, W1, b1, W2, b2)
    dZ2 = (P - y) / len(X)
    dZ1 = (dZ2 @ W2.T) * (1 - H ** 2)
    return bce(P, y), [X.T @ dZ1, dZ1.sum(0), H.T @ dZ2, dZ2.sum(0)]

def grad_check(params, eps=1e-6):
    _, grads = loss_and_grads(X_train[:20], y_train[:20], *params)
    worst = 0.0
    for P, G in zip(params, grads):
        for idx in [(0,) * P.ndim, tuple(s - 1 for s in P.shape)]:
            old = P[idx]; P[idx] = old + eps
            plus = loss_and_grads(X_train[:20], y_train[:20], *params)[0]
            P[idx] = old - eps
            minus = loss_and_grads(X_train[:20], y_train[:20], *params)[0]
            P[idx] = old
            num = (plus - minus) / (2 * eps)
            worst = max(worst, abs(num - G[idx]) / max(1e-12, abs(num) + abs(G[idx])))
    return worst

def train_numpy(lr, batch, epochs=100, hidden=16):
    rng = np.random.default_rng(SEED)
    params = init_params(hidden, rng)
    best = (np.inf, None, 0)
    for epoch in range(1, epochs + 1):
        order = rng.permutation(len(X_train))
        for s in range(0, len(order), batch):
            idx = order[s:s + batch]
            _, grads = loss_and_grads(X_train[idx], y_train[idx], *params)
            params = [p - lr * g for p, g in zip(params, grads)]
        val = bce(forward(X_val, *params)[1], y_val)
        if val < best[0]:
            best = (val, [p.copy() for p in params], epoch)
    return best

def accuracy(P, y):
    return float(((P >= 0.5) == y).mean())

print("gradient check, worst relative error:", f"{grad_check(init_params(16, np.random.default_rng(1))):.1e}")
results = {}
for lr in [0.01, 0.03, 0.1, 0.3]:
    for batch in [16, 64]:
        val, params, epoch = train_numpy(lr, batch)
        results[(lr, batch)] = (val, params, epoch)
        print(f"lr {lr:<5} batch {batch:<3} best val loss {val:.4f} at epoch {epoch:3d}  val acc {accuracy(forward(X_val, *params)[1], y_val):.3f}")
(lr, batch), (val, params, epoch) = min(results.items(), key=lambda kv: kv[1][0])
P = forward(X_test, *params)[1]
pred = (P >= 0.5).astype(float)
fn = int(((pred == 1) & (y_test == 0)).sum()); fp = int(((pred == 0) & (y_test == 1)).sum())
print(f"chosen lr {lr} batch {batch} epoch {epoch}: test acc {accuracy(P, y_test):.3f}, malignant called benign {fn}, benign called malignant {fp}")

# PyTorch version of the chosen setting
torch.manual_seed(SEED)
model = nn.Sequential(nn.Linear(30, 16), nn.Tanh(), nn.Linear(16, 1))
loss_fn = nn.BCEWithLogitsLoss()
opt = torch.optim.SGD(model.parameters(), lr=lr)
Xt, yt = torch.tensor(X_train, dtype=torch.float32), torch.tensor(y_train, dtype=torch.float32)
Xv, yv = torch.tensor(X_val, dtype=torch.float32), torch.tensor(y_val, dtype=torch.float32)
loader = torch.utils.data.DataLoader(torch.utils.data.TensorDataset(Xt, yt), batch_size=batch, shuffle=True)
best = (float("inf"), None, 0)
for e in range(1, 101):
    model.train()
    for xb, yb in loader:
        opt.zero_grad(); loss = loss_fn(model(xb), yb); loss.backward(); opt.step()
    model.eval()
    with torch.no_grad():
        v = loss_fn(model(Xv), yv).item()
    if v < best[0]:
        best = (v, {k: t.clone() for k, t in model.state_dict().items()}, e)
model.load_state_dict(best[1])
with torch.no_grad():
    pt = torch.sigmoid(model(torch.tensor(X_test, dtype=torch.float32))).numpy()
print(f"PyTorch: best val loss {best[0]:.4f} at epoch {best[2]}, test acc {accuracy(pt, y_test):.3f}")

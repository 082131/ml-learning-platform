# Fixture for trees.test.ts. Run from the repo root with CPython 3.13, NumPy 2.4.6, pandas 3.0.2 and
# scikit-learn 1.8.0:  ~/pyenv/bin/python src/lib/classical/fixtures/gen_trees.py > src/lib/classical/fixtures/trees.json
import json
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.tree import DecisionTreeClassifier, export_text

df = pd.read_csv("src/lib/classical/data/penguins.csv")
TOY = [12, 15, 16, 56, 96, 136, 177, 183, 250, 256, 298, 305, 311, 334]
FEATURES = ["bill_length_mm", "flipper_length_mm"]
CLASSES = ["Adelie", "Chinstrap", "Gentoo"]


def tree_dict(t):
    tr = t.tree_
    return {
        "feature": tr.feature.tolist(),
        "threshold": tr.threshold.tolist(),
        "impurity": tr.impurity.tolist(),
        "n": tr.n_node_samples.tolist(),
        # value holds class fractions in scikit-learn >= 1.4; multiply back to counts
        "counts": np.rint(tr.value[:, 0, :] * tr.n_node_samples[:, None]).astype(int).tolist(),
        "left": tr.children_left.tolist(),
        "right": tr.children_right.tolist(),
    }


def fit_tree(X, y, **kw):
    # Fit with several random_states: a tie between features would make the trees differ.
    trees = [DecisionTreeClassifier(random_state=rs, **kw).fit(X, y) for rs in range(10)]
    dicts = [tree_dict(t) for t in trees]
    assert all(d == dicts[0] for d in dicts), "tie between features: tree depends on random_state"
    return dicts[0]


toy = df.loc[TOY]
X = toy[FEATURES].to_numpy()
y = np.array([CLASSES.index(s) for s in toy["species"]])
out = {"toy_rows": TOY, "toy_tree": fit_tree(X, y), "toy_tree_depth2": fit_tree(X, y, max_depth=2)}
out["export_text"] = {
    str(depth): export_text(
        DecisionTreeClassifier(max_depth=depth, random_state=0).fit(X, toy["species"]), feature_names=FEATURES
    )
    for depth in [1, 2, 3]
}

full = df.dropna(subset=FEATURES)
Xf = full[FEATURES].to_numpy()
yf = np.array([CLASSES.index(s) for s in full["species"]])
out["full_tree_depth3"] = fit_tree(Xf, yf, max_depth=3)

xs = toy["flipper_length_mm"].to_numpy()
ys = toy["body_mass_g"].to_numpy()
boost = {}
for lr in [0.1, 0.3, 1.0]:
    g = GradientBoostingRegressor(n_estimators=30, learning_rate=lr, max_depth=1, random_state=0)
    g.fit(xs.reshape(-1, 1), ys)
    preds = list(g.staged_predict(xs.reshape(-1, 1)))
    boost[str(lr)] = {
        "mse": [float(np.mean((ys - p) ** 2)) for p in preds],
        "stage5": preds[4].tolist(),
        "thresholds": [float(e[0].tree_.threshold[0]) for e in g.estimators_],
    }
out["boost"] = boost
print(json.dumps(out))

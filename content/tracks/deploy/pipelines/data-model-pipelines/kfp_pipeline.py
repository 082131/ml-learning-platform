"""The lesson's pipeline as Kubeflow Pipelines (KFP v2) components, compiled to the YAML a cluster runs."""
from kfp import compiler, dsl
from kfp.dsl import Dataset, Input, Model, Output

IMAGE = "python:3.13-slim"
PKGS = ["scikit-learn==1.9.1"]


@dsl.component(base_image=IMAGE, packages_to_install=PKGS)
def ingest(version: str, train: Output[Dataset], test: Output[Dataset]):
    import numpy as np
    from sklearn.datasets import load_digits
    from sklearn.model_selection import train_test_split
    X, y = load_digits(return_X_y=True)
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=360, stratify=y, random_state=0)
    n = 900 if version == "v1" else len(Xtr)
    np.savez(train.path, X=Xtr[:n], y=ytr[:n])
    np.savez(test.path, X=Xte, y=yte)
    train.metadata["rows"] = n


@dsl.component(base_image=IMAGE, packages_to_install=PKGS)
def fit(train: Input[Dataset], C: float, model: Output[Model]):
    import pickle
    import numpy as np
    from sklearn.linear_model import LogisticRegression
    d = np.load(train.path + ".npz")
    clf = LogisticRegression(C=C, max_iter=5000).fit(d["X"] / 16.0, d["y"])
    with open(model.path, "wb") as f:
        pickle.dump(clf, f)


@dsl.component(base_image=IMAGE, packages_to_install=PKGS)
def evaluate(model: Input[Model], test: Input[Dataset]) -> float:
    import pickle
    import numpy as np
    d = np.load(test.path + ".npz")
    with open(model.path, "rb") as f:
        return float(pickle.load(f).score(d["X"] / 16.0, d["y"]))


@dsl.component(base_image=IMAGE)
def register(model: Input[Model], accuracy: float):
    print("register", model.uri, "accuracy", accuracy)   # a real step would call the registry's API


@dsl.pipeline(name="digits-training")
def digits(version: str = "v2", C: float = 1.0, threshold: float = 0.95):
    data = ingest(version=version)
    model = fit(train=data.outputs["train"], C=C)
    score = evaluate(model=model.outputs["model"], test=data.outputs["test"])
    with dsl.If(score.output >= threshold):
        register(model=model.outputs["model"], accuracy=score.output)


if __name__ == "__main__":
    compiler.Compiler().compile(digits, "digits_pipeline.yaml")

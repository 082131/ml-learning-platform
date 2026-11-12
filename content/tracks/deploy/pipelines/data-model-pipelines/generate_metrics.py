"""Train the pipeline lesson's model for every setting and write the test accuracies to metrics.json.

Data: scikit-learn's 8x8 digits. 360 test images are held out (stratified, random_state=0). Data version v1 uses
the first 900 training images, v2 all 1,437. Feature code f1 scales pixels to 0..1; f2 adds the 8 row sums and
8 column sums of each image (scaled the same way). Model: LogisticRegression with regularization strength C.
"""
import json

import numpy as np
import sklearn
from sklearn.datasets import load_digits
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split

X, y = load_digits(return_X_y=True)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=360, stratify=y, random_state=0)


def features(X, code):
    px = X / 16.0
    if code == "f1":
        return px
    img = px.reshape(-1, 8, 8)
    return np.hstack([px, img.sum(axis=2) / 8, img.sum(axis=1) / 8])


out = {}
for data, n in (("v1", 900), ("v2", len(X_train))):
    for code in ("f1", "f2"):
        for C in ("0.01", "0.1", "1", "10"):
            model = LogisticRegression(C=float(C), max_iter=5000)
            model.fit(features(X_train[:n], code), y_train[:n])
            acc = model.score(features(X_test, code), y_test)
            out[f"{data}/{code}/{C}"] = round(acc, 4)
print(json.dumps(out, indent=1))
print("scikit-learn", sklearn.__version__)
json.dump(out, open("metrics.json", "w"), indent=1)

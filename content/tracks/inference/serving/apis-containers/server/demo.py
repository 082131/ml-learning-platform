"""Sends good and bad requests to the API in-process (FastAPI's TestClient) and prints what comes back."""
import json
import os
import time

from fastapi.testclient import TestClient

import app as server

HERE = os.path.dirname(os.path.abspath(__file__))
sample = json.load(open(os.path.join(HERE, "sample.json")))
images = sample["images"]


def show(title, r):
    body = r.json()
    if r.status_code == 422:                       # keep the first validation error only
        e = body["detail"][0]
        body = {"loc": e["loc"], "msg": e["msg"]}
    print(f"{title:28s} {r.status_code}  {json.dumps(body)}")


with TestClient(server.app) as client:             # runs the lifespan: loads and warms the model
    show("GET /readyz", client.get("/readyz"))
    show("3 images", client.post("/predict", json={"images": images[:3]}))
    print(f"{'(true labels)':28s}      {sample['labels'][:3]}")
    show("63 pixels", client.post("/predict", json={"images": [images[0][:63]]}))
    show("pixel value 17", client.post("/predict", json={"images": [[17.0] + images[0][1:]]}))
    show("65 images", client.post("/predict", json={"images": images[:1] * 65}))
    show("text instead of numbers", client.post("/predict", json={"images": [["a"] * 64]}))

    original = server.run_model

    def slow(x):                                   # pretend the model hangs for a second
        time.sleep(1.0)
        return original(x)

    server.run_model = slow                        # predict() looks run_model up at call time
    show("model takes 1 s", client.post("/predict", json={"images": images[:1]}))
    server.run_model = original

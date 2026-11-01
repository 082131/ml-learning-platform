"""Measures the running API from outside: sequential latency, then throughput with concurrent clients.

    docker run --rm -p 8000:8000 digits-api:1     # in another terminal
    python3 load.py
"""
import json
import os
import time
from concurrent.futures import ThreadPoolExecutor

import httpx
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
body = {"images": json.load(open(os.path.join(HERE, "sample.json")))["images"][:1]}
URL = "http://127.0.0.1:8000/predict"


def timed(client):
    t0 = time.perf_counter()
    client.post(URL, json=body).raise_for_status()
    return (time.perf_counter() - t0) * 1e3


with httpx.Client() as c:                          # one client, one kept-alive connection
    for _ in range(50):
        timed(c)                                   # warm-up
    ms = np.array([timed(c) for _ in range(1000)])
print(f"sequential: p50 {np.percentile(ms, 50):.2f} ms  p99 {np.percentile(ms, 99):.2f} ms  ({1000 / ms.mean():.0f} req/s)")

for clients in [1, 4, 16]:
    def worker(_):
        with httpx.Client() as c:
            return [timed(c) for _ in range(300)]
    t0 = time.perf_counter()
    with ThreadPoolExecutor(clients) as pool:
        ms = np.concatenate(list(pool.map(worker, range(clients))))
    rate = len(ms) / (time.perf_counter() - t0)
    print(f"{clients:2d} clients: {rate:5.0f} req/s  p50 {np.percentile(ms, 50):6.2f} ms  p99 {np.percentile(ms, 99):6.2f} ms")

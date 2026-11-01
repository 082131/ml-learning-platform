"""An open-loop load test: requests are sent on a fixed schedule, whatever the server does, and each latency is
measured from when the request was due, so a slow server cannot hide its queue (coordinated omission).

Start the serving lesson's container first:   docker run --rm -p 8000:8000 digits-api:1
Then:                                          python3 ramp.py
Needs httpx and NumPy.
"""
import asyncio
import json
import os
import time

import httpx
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SAMPLE = os.path.join(HERE, "../../serving/apis-containers/server/sample.json")
body = {"images": json.load(open(SAMPLE))["images"][:1]}
URL = "http://127.0.0.1:8000/predict"
STEP_S = 10                       # seconds at each rate
TIMEOUT_S = 2.0                   # a request slower than this, counted from its due time, is an error


async def one(client, due, results):
    await asyncio.sleep(max(0.0, due - time.perf_counter()))
    try:
        r = await client.post(URL, json=body, timeout=TIMEOUT_S)
        ok = r.status_code == 200
    except httpx.HTTPError:
        ok = False
    ms = (time.perf_counter() - due) * 1e3        # latency from when it was due
    results.append((ms, ok and ms <= TIMEOUT_S * 1e3))


async def step(client, rate):
    start = time.perf_counter() + 0.1
    results = []
    tasks = [asyncio.create_task(one(client, start + i / rate, results)) for i in range(rate * STEP_S)]
    await asyncio.gather(*tasks)
    ms = np.array([m for m, _ in results])           # percentiles over all requests, failed ones included
    errors = sum(not ok for _, ok in results)
    done = (len(results) - errors) / (time.perf_counter() - start)
    print(f"{rate:5d} req/s offered  {done:5.0f} served in time  p50 {np.percentile(ms, 50):7.1f} ms"
          f"  p99 {np.percentile(ms, 99):7.1f} ms  errors {errors / len(results):5.1%}")


async def main():
    limits = httpx.Limits(max_connections=200, max_keepalive_connections=200)
    async with httpx.AsyncClient(limits=limits, trust_env=False) as client:
        for rate in [100, 200, 300, 400, 450, 500, 600]:
            await step(client, rate)


asyncio.run(main())

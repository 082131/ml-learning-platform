"""A digits classifier behind an HTTP API, with input validation, a timeout, health checks and a version label.

Run locally:      uvicorn app:app --port 8000
Run the demo:     python3 demo.py
Build the image:  docker build -t digits-api .
"""
import asyncio
import os
from contextlib import asynccontextmanager
from typing import Annotated

import numpy as np
import onnxruntime as ort
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

MODEL_PATH = os.environ.get("MODEL_PATH", os.path.join(os.path.dirname(os.path.abspath(__file__)), "model.onnx"))
MODEL_VERSION = os.environ.get("MODEL_VERSION", "digits-1")
TIMEOUT_S = float(os.environ.get("TIMEOUT_S", "0.5"))
MAX_BATCH = 64

Pixel = Annotated[float, Field(ge=0, le=16)]                       # the digits images use 0 to 16
Image = Annotated[list[Pixel], Field(min_length=64, max_length=64)]  # 8 x 8, flattened


class PredictRequest(BaseModel):
    images: Annotated[list[Image], Field(min_length=1, max_length=MAX_BATCH)]


class PredictResponse(BaseModel):
    labels: list[int]
    confidence: list[float]
    model_version: str


state: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    options = ort.SessionOptions()
    options.intra_op_num_threads = 1                                 # one request per core; scale with workers
    session = ort.InferenceSession(MODEL_PATH, options, providers=["CPUExecutionProvider"])
    session.run(None, {"pixels": np.zeros((1, 64), dtype=np.float32)})   # warm up before taking traffic
    state["session"] = session
    yield
    state.clear()


app = FastAPI(lifespan=lifespan)


@app.get("/healthz")
def healthz():
    """Liveness: the process is running. Restart the container if this fails."""
    return {"status": "ok"}


@app.get("/readyz")
def readyz():
    """Readiness: the model is loaded and warm. Send traffic only when this succeeds."""
    if "session" not in state:
        raise HTTPException(status_code=503, detail="model not loaded")
    return {"status": "ready", "model_version": MODEL_VERSION}


def run_model(x: np.ndarray) -> np.ndarray:
    (probs,) = state["session"].run(None, {"pixels": x})
    return probs


@app.post("/predict", response_model=PredictResponse)
async def predict(req: PredictRequest):
    x = np.asarray(req.images, dtype=np.float32)
    try:
        probs = await asyncio.wait_for(asyncio.to_thread(run_model, x), timeout=TIMEOUT_S)
    except TimeoutError:
        raise HTTPException(status_code=504, detail=f"inference took longer than {TIMEOUT_S} s")
    return PredictResponse(
        labels=probs.argmax(axis=1).tolist(),
        confidence=[round(float(p), 3) for p in probs.max(axis=1)],   # float32 -> float before rounding
        model_version=MODEL_VERSION,
    )

"""Quantize the tiny F32 GGUF with llama.cpp's quantizer (through llama-cpp-python) and time generation."""
import ctypes, os, time
import llama_cpp
from llama_cpp import Llama

SRC = "tiny-llama-f32.gguf"
TYPES = {"Q8_0": llama_cpp.LLAMA_FTYPE_MOSTLY_Q8_0, "Q4_K_M": llama_cpp.LLAMA_FTYPE_MOSTLY_Q4_K_M,
         "Q4_0": llama_cpp.LLAMA_FTYPE_MOSTLY_Q4_0}
for name, ftype in TYPES.items():
    params = llama_cpp.llama_model_quantize_default_params()
    params.ftype = ftype
    params.nthread = 4
    rc = llama_cpp.llama_model_quantize(SRC.encode(), f"tiny-llama-{name}.gguf".encode(), ctypes.byref(params))
    assert rc == 0, rc

PROMPT = "the model"
N_NEW = 64
for name in ["F32", "Q8_0", "Q4_K_M", "Q4_0"]:
    path = f"tiny-llama-{name.lower() if name == 'F32' else name}.gguf"
    m = Llama(path, n_ctx=512, n_threads=4, seed=1, verbose=False)
    prompt = m.tokenize(PROMPT.encode())
    best = 0.0
    for _ in range(4):                                    # the first run doubles as a warm-up
        m.reset()
        t0 = time.perf_counter()
        n = 0
        for _tok in m.generate(prompt, temp=0.0, reset=True):
            n += 1
            if n == N_NEW:
                break
        best = max(best, n / (time.perf_counter() - t0))
    print(f"{name:7s} {os.path.getsize(path) / 2**20:6.1f} MiB  {best:5.0f} tokens/s (best of 4, {N_NEW} new tokens, prompt included)")

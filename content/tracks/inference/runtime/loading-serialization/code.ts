// Code for the loading and serialization lesson. Every output below was produced with CPython 3.13,
// NumPy 2.5.3 and safetensors 0.8.0. The layout and inspect printout are checked against the library in
// src/lib/inference/safetensors.test.ts.
import { ann, annLine } from '@/lib/inference/annotate';
import { checkpointExperiment, INSPECT_SOURCE, SAVE_SOURCE, saveSlots, type CheckpointState } from '@/lib/inference/safetensors';
import type { CodeExample } from '@/lib/types';

export const initial: CheckpointState = { dtype: 'float32', scenario: 'match' };

export const experiment = checkpointExperiment('checkpoint', initial);

const st = (s: unknown) => s as CheckpointState;
const SV = SAVE_SOURCE;
const IN = INSPECT_SOURCE;

export const saveCode: CodeExample = {
  id: 'checkpoint-save',
  language: 'python',
  source: SV,
  slots: Object.fromEntries(['hidden', 'prefix', 'dtype', 'bias2'].map((k) => [k, (s: unknown) => saveSlots(st(s))[k]!])),
  annotations: [
    ann(SV, 'names', '"{{prefix}}fc1.weight"', '"{{prefix}}fc1.weight"', {
      kind: 'variable',
      title: 'Parameter names',
      what: 'The keys of the dictionary. In PyTorch they come from the attribute names: self.fc1 = nn.Linear(...) gives "fc1.weight" and "fc1.bias".',
      why: 'Loading matches tensors to parameters by name only. A wrapper that adds a prefix breaks every match.',
    }),
    ann(SV, 'dtype', '"{{prefix}}fc1.weight"', 'np.{{dtype}}', {
      kind: 'parameter',
      title: 'Stored dtype',
      what: 'The precision the values are saved in. float16 halves the file; float64 doubles it.',
      why: 'The header records it, so the loader knows how to read the bytes and can convert them to the model’s dtype.',
    }),
    ann(SV, 'save', 'save_file(', 'save_file(tensors, "model.safetensors")', {
      kind: 'framework',
      title: 'save_file',
      what: 'Writes the header length, the JSON header and every tensor’s raw bytes.',
      why: 'No Python objects are serialized, only numbers and a description of them, so loading can never run code.',
    }),
  ],
};

export const inspectCode: CodeExample = {
  id: 'checkpoint-inspect',
  language: 'python',
  source: IN,
  annotations: [
    ann(IN, 'len', 'n = struct.unpack', 'struct.unpack("<Q", f.read(8))[0]', {
      kind: 'framework',
      title: 'The header length',
      what: '"<Q" means an unsigned 64-bit integer, little-endian. The first 8 bytes of the file say how long the header is.',
      why: 'The loader reads exactly that many bytes next, and nothing else, to learn what the file contains.',
    }),
    ann(IN, 'json', 'header = json.loads', 'json.loads(f.read(n))', {
      kind: 'framework',
      title: 'Plain JSON',
      what: 'For each tensor: its dtype, its shape, and the byte range of its data after the header.',
      why: 'JSON can only describe data, so parsing it is safe even for a file downloaded from the internet.',
    }),
    ann(IN, 'offsets', 'start, end = info', 'info["data_offsets"]', {
      kind: 'variable',
      title: 'data_offsets',
      what: 'Start and end of the tensor’s bytes, counted from the end of the header.',
      why: 'A loader can seek to one tensor and read only it, or memory-map the file and let the OS read pages on demand.',
    }),
    ann(IN, 'missing', 'print("missing:', '[k for k in expected if k not in header]', {
      kind: 'math',
      title: 'The same three checks as strict loading',
      what: 'Names the model needs that the file lacks, names the file has that the model lacks, and names whose shapes differ.',
      why: 'PyTorch’s load_state_dict(strict=True) refuses a file for exactly these reasons. Checking first gives a readable report.',
    }),
  ],
};

const P = `import pickle


class Payload:
    def __reduce__(self):                         # tells pickle how to rebuild this object
        return (print, ("this ran while the file was being loaded",))


blob = pickle.dumps({"fc1.weight": [0.1, 0.2], "extra": Payload()})
weights = pickle.loads(blob)                      # calls print(...) to "rebuild" extra
print(weights)`;

/** Why pickle-based checkpoints are unsafe: loading calls whatever function the file names. */
export const pickleDemo: CodeExample = {
  id: 'checkpoint-pickle',
  language: 'python',
  run: 'pyodide',
  source: P,
  annotations: [
    annLine(P, 'reduce', 'return (print,', {
      kind: 'function',
      title: '__reduce__',
      what: 'Returns a function and its arguments. pickle stores them, and on loading calls the function to rebuild the object.',
      why: 'Here the function is print. A malicious file could name os.system with any command instead.',
    }),
    annLine(P, 'loads', 'weights = pickle.loads(blob)', {
      kind: 'framework',
      title: 'pickle.loads',
      what: 'Rebuilds the objects, running the stored function calls.',
      why: 'The code runs before you get the result back, so inspecting the loaded dictionary afterwards is too late.',
    }),
  ],
  expectedOutput: `this ran while the file was being loaded
{'fc1.weight': [0.1, 0.2], 'extra': None}`,
};

const W = `import json
import struct

import numpy as np

DTYPES = {"float32": "F32", "float16": "F16", "int64": "I64"}


def save(tensors, path):
    header, offset = {}, 0
    for name, a in tensors.items():
        header[name] = {"dtype": DTYPES[a.dtype.name], "shape": list(a.shape),
                        "data_offsets": [offset, offset + a.nbytes]}
        offset += a.nbytes
    h = json.dumps(header, separators=(",", ":")).encode()
    h += b" " * (-len(h) % 8)                     # pad the header to a multiple of 8 bytes
    with open(path, "wb") as f:
        f.write(struct.pack("<Q", len(h)))        # 8-byte little-endian header length
        f.write(h)
        for a in tensors.values():
            f.write(a.tobytes())                  # raw values, no code, no pickle


def load_one(path, name):
    with open(path, "rb") as f:
        n = struct.unpack("<Q", f.read(8))[0]
        info = json.loads(f.read(n))[name]
        start, end = info["data_offsets"]
        f.seek(8 + n + start)                     # jump straight to this tensor
        dtype = {v: k for k, v in DTYPES.items()}[info["dtype"]]
        return np.frombuffer(f.read(end - start), dtype=dtype).reshape(info["shape"])


W = np.arange(12, dtype=np.float32).reshape(3, 4)
save({"fc.weight": W, "fc.bias": np.ones(3, dtype=np.float32)}, "tiny.safetensors")
raw = open("tiny.safetensors", "rb").read()
print(len(raw), "bytes:", raw[:8].hex(" "))
print(raw[8:8 + struct.unpack("<Q", raw[:8])[0]].decode())
print(load_one("tiny.safetensors", "fc.weight"))`;

/** The format written and read from scratch, in 30 lines. */
export const formatFromScratch: CodeExample = {
  id: 'checkpoint-scratch',
  language: 'python',
  run: 'pyodide',
  source: W,
  annotations: [
    annLine(W, 'pad', 'h += b" " * (-len(h) % 8)', {
      kind: 'math',
      title: 'Padding to 8 bytes',
      what: '-len(h) % 8 is how many bytes are needed to reach the next multiple of 8 (0 to 7). Spaces are valid JSON whitespace.',
      why: 'Keeps the data aligned, so 8-byte values can be read in place without copying.',
    }),
    annLine(W, 'tobytes', 'f.write(a.tobytes())', {
      kind: 'framework',
      title: 'Raw bytes',
      what: 'The array’s values exactly as they sit in memory: 4 bytes per float32, little-endian.',
      why: 'Reading them back is a copy (or a memory map), with no parsing and no code.',
    }),
    annLine(W, 'seek', 'f.seek(8 + n + start)', {
      kind: 'framework',
      title: 'Read one tensor',
      what: 'Skips the length, the header and every tensor stored before this one.',
      why: 'A server that only needs some tensors, or each GPU that only needs its shard, reads just those bytes.',
    }),
  ],
  expectedOutput: `196 bytes: 80 00 00 00 00 00 00 00
{"fc.weight":{"dtype":"F32","shape":[3,4],"data_offsets":[0,48]},"fc.bias":{"dtype":"F32","shape":[3],"data_offsets":[48,60]}}  
[[ 0.  1.  2.  3.]
 [ 4.  5.  6.  7.]
 [ 8.  9. 10. 11.]]`,
};

const L = `import time
import numpy as np
from safetensors import safe_open
from safetensors.numpy import load_file, save_file

layers = {f"layer{i}.weight": np.ones((4096, 4096), dtype=np.float16) for i in range(16)}
save_file(layers, "big.safetensors")              # 16 x 32 MiB = 512 MiB

t0 = time.perf_counter()
everything = load_file("big.safetensors")         # reads all 512 MiB into memory
t1 = time.perf_counter()
with safe_open("big.safetensors", framework="np") as f:
    names = list(f.keys())                        # only the header is read
    one = f.get_tensor("layer7.weight")           # reads 32 MiB
t2 = time.perf_counter()
print(f"load_file, all 16 tensors: {(t1 - t0) * 1e3:7.1f} ms")
print(f"safe_open, header + 1:     {(t2 - t1) * 1e3:7.1f} ms")
print(len(names), one.shape, one.dtype)`;

/** Lazy loading: read only what you need. Measured, so the times are machine-specific. */
export const lazyLoad: CodeExample = {
  id: 'checkpoint-lazy',
  language: 'python',
  source: L,
  annotations: [
    ann(L, 'safe-open', 'with safe_open(', 'safe_open("big.safetensors", framework="np")', {
      kind: 'framework',
      title: 'safe_open',
      what: 'Opens the file and reads only the header. Tensors are read when you ask for them.',
      why: 'Loading time and memory then depend on what you use, not on the file size.',
    }),
  ],
};

export const lazyOutput: CodeExample = {
  id: 'checkpoint-lazy-output',
  language: 'bash',
  source: `python lazy.py   # 4-thread cloud VM, file in the page cache, safetensors 0.8.0
# load_file, all 16 tensors:   391.1 ms
# safe_open, header + 1:        24.8 ms
# 16 (4096, 4096) float16`,
  annotations: [],
};

const T = `import torch
from safetensors.torch import load_file

model = Net()                                          # build the architecture in code
state = load_file("model.safetensors", device="cpu")  # tensors only: nothing can run
result = model.load_state_dict(state, strict=True)    # raises on missing, unexpected or wrong-shape keys
model.eval()

# Old .pt checkpoints are pickles. weights_only=True (the default since PyTorch 2.6)
# refuses anything that is not a tensor or a plain container:
state = torch.load("old_model.pt", map_location="cpu", weights_only=True)`;

/** Loading safely in PyTorch. Not run here: no PyTorch was installed while writing the lesson. */
export const torchLoad: CodeExample = {
  id: 'checkpoint-torch',
  language: 'python',
  source: T,
  annotations: [
    ann(T, 'strict', 'result = model.load_state_dict', 'strict=True', {
      kind: 'parameter',
      title: 'strict=True',
      what: 'The default. Fails with a list of missing keys, unexpected keys and size mismatches.',
      why: 'strict=False silently leaves unmatched parameters at their random initial values: the model loads and gives wrong answers.',
    }),
    ann(T, 'map', 'state = torch.load(', 'map_location="cpu"', {
      kind: 'parameter',
      title: 'map_location',
      what: 'Where to put the loaded tensors. A checkpoint saved on cuda:0 otherwise tries to load onto cuda:0.',
      why: 'Lets a CPU-only machine, or a different GPU, load the file.',
    }),
    ann(T, 'weights-only', 'state = torch.load(', 'weights_only=True', {
      kind: 'parameter',
      title: 'weights_only=True',
      what: 'Restricts unpickling to tensors, numbers, strings and containers of them.',
      why: 'Blocks the __reduce__ trick shown above. Never pass weights_only=False for a file you did not create.',
    }),
  ],
};

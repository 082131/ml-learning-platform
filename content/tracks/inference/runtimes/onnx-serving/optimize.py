"""Builds the digits classifier as an ONNX graph the way an exporter might write it, then lets ONNX Runtime
optimize it at each level and prints the nodes that remain.

Run from this folder with onnx 1.23 and onnxruntime 1.29 (the versions behind the lesson's recorded output):
    python3 optimize.py
It writes digits_ops.onnx and digits_<level>.onnx to the current folder (they are not committed).
src/lib/inference/onnxGraph.test.ts runs it and checks the lesson's node lists against its output.
"""
import json
import os

import numpy as np
import onnx
import onnxruntime as ort
from onnx import TensorProto, helper, numpy_helper

HERE = os.path.dirname(os.path.abspath(__file__))
DIGITS = os.path.join(HERE, "../../precision/precision-quantization/digits_mlp.json")

m = json.load(open(DIGITS))
W1t = np.array(m["W1"], dtype=np.float32)          # (16, 64), stored (out, in) like torch.nn.Linear
W2t = np.array(m["W2"], dtype=np.float32)          # (10, 16)
b1 = np.array(m["b1"], dtype=np.float32)
b2 = np.array(m["b2"], dtype=np.float32)
inits = [numpy_helper.from_array(a, n) for a, n in
         [(W1t, "fc1.weight"), (b1, "fc1.bias"), (W2t, "fc2.weight"), (b2, "fc2.bias"),
          (np.array(1 / 16, dtype=np.float32), "scale")]]
nodes = [
    helper.make_node("Mul", ["pixels", "scale"], ["x"]),                 # preprocessing in the graph
    helper.make_node("Transpose", ["fc1.weight"], ["W1"], perm=[1, 0]),  # as exporters often write it
    helper.make_node("MatMul", ["x", "W1"], ["xw"]),
    helper.make_node("Add", ["xw", "fc1.bias"], ["z"]),
    helper.make_node("Relu", ["z"], ["h"]),
    helper.make_node("Transpose", ["fc2.weight"], ["W2"], perm=[1, 0]),
    helper.make_node("MatMul", ["h", "W2"], ["hw"]),
    helper.make_node("Add", ["hw", "fc2.bias"], ["logits"]),
    helper.make_node("Softmax", ["logits"], ["probs"], axis=1),
]
graph = helper.make_graph(nodes, "digits", [helper.make_tensor_value_info("pixels", TensorProto.FLOAT, ["batch", 64])],
                          [helper.make_tensor_value_info("probs", TensorProto.FLOAT, ["batch", 10])], inits)
model = helper.make_model(graph, opset_imports=[helper.make_opsetid("", 21)], ir_version=10)
onnx.checker.check_model(model)
onnx.save(model, "digits_ops.onnx")

pixels = np.array(m["test"]["X"], dtype=np.float32)               # (360, 64)
levels = {"disabled": ort.GraphOptimizationLevel.ORT_DISABLE_ALL,
          "basic": ort.GraphOptimizationLevel.ORT_ENABLE_BASIC,
          "extended": ort.GraphOptimizationLevel.ORT_ENABLE_EXTENDED,
          "all": ort.GraphOptimizationLevel.ORT_ENABLE_ALL}
ref = None
for name, level in levels.items():
    so = ort.SessionOptions()
    so.graph_optimization_level = level
    so.optimized_model_filepath = f"digits_{name}.onnx"
    so.log_severity_level = 3                                    # errors only
    sess = ort.InferenceSession("digits_ops.onnx", so, providers=["CPUExecutionProvider"])
    (probs,) = sess.run(None, {"pixels": pixels})
    ops = [n.op_type for n in onnx.load(f"digits_{name}.onnx").graph.node]
    ref = probs if ref is None else ref
    print(f"{name:9s} {len(ops)} nodes: {' -> '.join(ops)}   max diff {np.abs(probs - ref).max():.1e}")

# Parity with NumPy (the reference implementation)
x = pixels / 16
logits = np.maximum(x @ W1t.T + b1, 0) @ W2t.T + b2
e = np.exp(logits - logits.max(axis=1, keepdims=True))
print("max |ORT - NumPy|:", f"{np.abs(probs - e / e.sum(axis=1, keepdims=True)).max():.1e}",
      " same predictions:", (probs.argmax(1) == logits.argmax(1)).all())
print("providers:", ort.get_available_providers())

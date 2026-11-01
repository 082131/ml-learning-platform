"""Writes model.onnx (the digits classifier from the precision lesson) and sample.json (five test images).

Run from this folder with onnx 1.23:  python3 make_model.py
Neither output is committed; the Dockerfile copies model.onnx into the image.
"""
import json
import os

import numpy as np
import onnx
from onnx import TensorProto, helper, numpy_helper

HERE = os.path.dirname(os.path.abspath(__file__))
m = json.load(open(os.path.join(HERE, "../../../precision/precision-quantization/digits_mlp.json")))
W1 = np.array(m["W1"], dtype=np.float32).T          # (64, 16)
W2 = np.array(m["W2"], dtype=np.float32).T          # (16, 10)
inits = [numpy_helper.from_array(a, n) for a, n in [
    (np.array(1 / 16, dtype=np.float32), "scale"), (W1, "W1"), (np.array(m["b1"], dtype=np.float32), "b1"),
    (W2, "W2"), (np.array(m["b2"], dtype=np.float32), "b2")]]
nodes = [
    helper.make_node("Mul", ["pixels", "scale"], ["x"]),
    helper.make_node("Gemm", ["x", "W1", "b1"], ["z"]),
    helper.make_node("Relu", ["z"], ["h"]),
    helper.make_node("Gemm", ["h", "W2", "b2"], ["logits"]),
    helper.make_node("Softmax", ["logits"], ["probs"], axis=1),
]
graph = helper.make_graph(nodes, "digits", [helper.make_tensor_value_info("pixels", TensorProto.FLOAT, ["batch", 64])],
                          [helper.make_tensor_value_info("probs", TensorProto.FLOAT, ["batch", 10])], inits)
model = helper.make_model(graph, opset_imports=[helper.make_opsetid("", 21)], ir_version=10)
onnx.checker.check_model(model)
onnx.save(model, os.path.join(HERE, "model.onnx"))
json.dump({"images": m["test"]["X"][:5], "labels": m["test"]["y"][:5]}, open(os.path.join(HERE, "sample.json"), "w"))
print("wrote model.onnx and sample.json")

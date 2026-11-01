"""Reference benchmark for the capstone: one model, a baseline and two optimizations (INT8 weights, batching),
each measured separately for accuracy, size, latency and throughput on the same machine.

Run with scikit-learn 1.9, onnx 1.23, onnxruntime 1.29 and NumPy 2.5:  python3 benchmark.py
It writes digits_fp32.onnx and digits_int8.onnx to the current folder (not committed).
"""
import os
import platform
import time

import numpy as np
import onnx
import onnxruntime as ort
from onnx import TensorProto, helper, numpy_helper
from onnxruntime.quantization import QuantType, quantize_dynamic
from sklearn.datasets import load_digits
from sklearn.model_selection import train_test_split
from sklearn.neural_network import MLPClassifier

# 1. A model big enough to measure: 64 -> 1024 -> 1024 -> 10, trained on the digits training split.
X, y = load_digits(return_X_y=True)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=360, random_state=0, stratify=y)
mlp = MLPClassifier(hidden_layer_sizes=(1024, 1024), max_iter=60, random_state=0).fit(X_train / 16, y_train)

# 2. Export it to ONNX by hand: Mul (scale), Gemm, Relu, Gemm, Relu, Gemm, Softmax.
inits = [numpy_helper.from_array(np.array(1 / 16, dtype=np.float32), "scale")]
nodes, prev = [helper.make_node("Mul", ["pixels", "scale"], ["h0"])], "h0"
for i, (W, b) in enumerate(zip(mlp.coefs_, mlp.intercepts_)):
    inits += [numpy_helper.from_array(W.astype(np.float32), f"W{i}"), numpy_helper.from_array(b.astype(np.float32), f"b{i}")]
    nodes.append(helper.make_node("Gemm", [prev, f"W{i}", f"b{i}"], [f"z{i}"]))
    last = i == len(mlp.coefs_) - 1
    nodes.append(helper.make_node("Softmax" if last else "Relu", [f"z{i}"], ["probs" if last else f"h{i + 1}"], **({"axis": 1} if last else {})))
    prev = f"h{i + 1}"
graph = helper.make_graph(nodes, "digits", [helper.make_tensor_value_info("pixels", TensorProto.FLOAT, ["batch", 64])],
                          [helper.make_tensor_value_info("probs", TensorProto.FLOAT, ["batch", 10])], inits)
onnx.save(helper.make_model(graph, opset_imports=[helper.make_opsetid("", 21)], ir_version=10), "digits_fp32.onnx")

# 3. Optimization A: dynamic INT8 quantization of the weights.
quantize_dynamic("digits_fp32.onnx", "digits_int8.onnx", weight_type=QuantType.QInt8)


def session(path):
    so = ort.SessionOptions()
    so.intra_op_num_threads = 1                  # one core, as one server worker would use
    so.log_severity_level = 3
    return ort.InferenceSession(path, so, providers=["CPUExecutionProvider"])


def latency_ms(sess, batch, calls):
    x = X_test[:batch].astype(np.float32)
    for _ in range(20):
        sess.run(None, {"pixels": x})            # warm-up
    times = []
    for _ in range(calls):
        t0 = time.perf_counter()
        sess.run(None, {"pixels": x})
        times.append((time.perf_counter() - t0) * 1e3)
    return np.array(times)


print(f"{platform.processor() or platform.machine()}, {os.cpu_count()} cores; onnxruntime {ort.__version__}, 1 thread")
print(f"{'variant':14s} {'accuracy':>8s} {'size':>9s} {'p50 b=1':>10s} {'p99 b=1':>10s} {'images/s b=1':>13s} {'images/s b=32':>14s}")
for name, path in [("fp32", "digits_fp32.onnx"), ("int8 weights", "digits_int8.onnx")]:
    sess = session(path)
    (probs,) = sess.run(None, {"pixels": X_test.astype(np.float32)})
    acc = (probs.argmax(1) == y_test).mean()
    one = latency_ms(sess, 1, 2000)              # optimization B is batching: compare batch 1 with batch 32
    many = latency_ms(sess, 32, 300)
    print(f"{name:14s} {acc:8.2%} {os.path.getsize(path) / 2**20:5.2f} MiB {np.percentile(one, 50):7.3f} ms"
          f" {np.percentile(one, 99):7.3f} ms {1e3 / np.median(one):13,.0f} {32 * 1e3 / np.median(many):14,.0f}")

// Code for the ONNX lesson. Outputs were produced with onnx 1.23.2, onnxruntime 1.29.0 and NumPy 2.5.3 on
// CPython 3.13 (optimize.py in this folder; src/lib/inference/onnxGraph.test.ts re-runs it).
import { ann, annLine } from '@/lib/inference/annotate';
import { onnxExperiment, type OnnxState } from '@/lib/inference/onnxGraph';
import type { CodeExample } from '@/lib/types';

export const initial: OnnxState = { level: 'disabled', batch: 1 };

export const experiment = onnxExperiment('onnx', initial);

const S = `import onnxruntime as ort

so = ort.SessionOptions()
so.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_EXTENDED
so.optimized_model_filepath = "digits_extended.onnx"       # save what the runtime will execute
sess = ort.InferenceSession("digits_ops.onnx", so,
                            providers=["CUDAExecutionProvider", "CPUExecutionProvider"])
print(sess.get_providers())                                # the providers actually in use
(probs,) = sess.run(None, {"pixels": pixels})              # (360, 64) float32 -> (360, 10)`;

export const sessionCode: CodeExample = {
  id: 'onnx-session',
  language: 'python',
  source: S,
  annotations: [
    ann(S, 'level', 'so.graph_optimization_level', 'ORT_ENABLE_EXTENDED', {
      kind: 'parameter',
      title: 'Optimization level',
      what: 'BASIC folds constants and applies fusions that work on any hardware; EXTENDED adds fusions into ONNX Runtime’s own operators; ALL adds hardware-specific layout changes. The default is ALL.',
      why: 'Higher levels usually run faster. The saved file shows exactly what changed.',
    }),
    ann(S, 'save', 'so.optimized_model_filepath', 'so.optimized_model_filepath', {
      kind: 'framework',
      title: 'Save the optimized graph',
      what: 'Writes the graph after optimization to a file you can open with onnx.load or Netron.',
      why: 'The only way to see the fused nodes. With level ALL the file may only be valid on the same kind of machine.',
    }),
    ann(S, 'providers', 'providers=[', '["CUDAExecutionProvider", "CPUExecutionProvider"]', {
      kind: 'parameter',
      title: 'Execution providers, in order of preference',
      what: 'Nodes go to the first provider that supports them; the rest fall back to the CPU.',
      why: 'If the CUDA provider is missing (wrong package, no GPU), the session silently runs on the CPU.',
    }),
    ann(S, 'get', 'print(sess.get_providers())', 'sess.get_providers()', {
      kind: 'framework',
      title: 'Check what you got',
      what: 'Lists the providers the session actually uses.',
      why: 'Log it at startup, so a server that fell back to the CPU is noticed before latency alarms go off.',
    }),
  ],
};

export const optimizeOutput: CodeExample = {
  id: 'onnx-optimize-output',
  language: 'bash',
  source: `python optimize.py   # onnx 1.23.2, onnxruntime 1.29.0, CPU
# disabled  9 nodes: Mul -> Transpose -> MatMul -> Add -> Relu -> Transpose -> MatMul -> Add -> Softmax   max diff 0.0e+00
# basic     5 nodes: Mul -> Gemm -> Relu -> Gemm -> Softmax   max diff 0.0e+00
# extended  4 nodes: Mul -> FusedGemm -> Gemm -> Softmax   max diff 0.0e+00
# all       4 nodes: Mul -> FusedGemm -> Gemm -> Softmax   max diff 0.0e+00
# max |ORT - NumPy|: 1.2e-07  same predictions: True
# providers: ['AzureExecutionProvider', 'CPUExecutionProvider']`,
  annotations: [],
};

const P = `x = pixels / 16
logits = np.maximum(x @ W1t.T + b1, 0) @ W2t.T + b2          # the reference, in NumPy
e = np.exp(logits - logits.max(axis=1, keepdims=True))
ref = e / e.sum(axis=1, keepdims=True)
print("max |ORT - NumPy|:", f"{np.abs(probs - ref).max():.1e}",
      " same predictions:", (probs.argmax(1) == ref.argmax(1)).all())`;

export const parityCode: CodeExample = {
  id: 'onnx-parity',
  language: 'python',
  source: P,
  annotations: [
    ann(P, 'maxdiff', 'print("max |ORT', 'np.abs(probs - ref).max()', {
      kind: 'math',
      title: 'Largest absolute difference',
      what: 'Compares every output value of the runtime with the reference implementation.',
      why: 'Exact equality is not expected: kernels add numbers in different orders. About 1e-7 in float32 is rounding; 1e-2 is a bug.',
      output: '1.2e-07',
    }),
    ann(P, 'argmax', 'same predictions', '(probs.argmax(1) == ref.argmax(1)).all()', {
      kind: 'math',
      title: 'Same decisions',
      what: 'Checks that every image gets the same predicted digit.',
      why: 'Tiny numeric differences can still flip a prediction when two classes are nearly tied; count the flips.',
    }),
  ],
};

const E = `import torch

model = Net().eval()
example = torch.randn(1, 64)
torch.onnx.export(model, (example,), "digits.onnx",
                  input_names=["pixels"], output_names=["logits"],
                  dynamic_axes={"pixels": {0: "batch"}, "logits": {0: "batch"}},
                  opset_version=21)

with torch.inference_mode():
    expected = model(test_batch).numpy()
actual = ort.InferenceSession("digits.onnx").run(None, {"pixels": test_batch.numpy()})[0]
assert np.allclose(actual, expected, atol=1e-5), np.abs(actual - expected).max()`;

/** Exporting from PyTorch and checking parity. Not run here: no PyTorch was installed while writing. */
export const exportCode: CodeExample = {
  id: 'onnx-export',
  language: 'python',
  source: E,
  annotations: [
    annLine(E, 'eval', 'model = Net().eval()', {
      kind: 'framework',
      title: 'Export in eval mode',
      what: 'Dropout off, batch norm using stored statistics.',
      why: 'The exporter records whatever the model does during the example call, including training-mode behavior.',
    }),
    ann(E, 'dynamic', 'dynamic_axes=', 'dynamic_axes={"pixels": {0: "batch"}, "logits": {0: "batch"}}', {
      kind: 'parameter',
      title: 'A symbolic batch dimension',
      what: 'Marks dimension 0 of the input and output as variable, named "batch".',
      why: 'Without it the example’s batch size (1) is fixed into the graph.',
    }),
    ann(E, 'opset', 'opset_version=21', 'opset_version=21', {
      kind: 'parameter',
      title: 'Opset version',
      what: 'Which version of the ONNX operator definitions the graph uses.',
      why: 'The runtime you deploy must support it. Pin it, and test the file with that runtime version.',
    }),
    annLine(E, 'allclose', 'assert np.allclose', {
      kind: 'math',
      title: 'Parity test',
      what: 'Runs the same inputs through PyTorch and ONNX Runtime and compares.',
      why: 'An export can succeed and still compute something different (an unsupported op traced as a constant, for example).',
    }),
  ],
};

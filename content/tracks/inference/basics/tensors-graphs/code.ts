// Code for the tensors and graphs lesson. The graph printout is checked against NumPy 2.5.3 on CPython 3.13 in
// src/lib/inference/tensorGraph.test.ts. The ONNX outputs were produced with onnx 1.23.2 and onnxruntime 1.29.0.
import { ann, annLine } from '@/lib/inference/annotate';
import type { DigitsModel } from '@/lib/inference/digitsModel';
import { GRAPH_SOURCE, graphExperiment, graphSlots, type GraphState } from '@/lib/inference/tensorGraph';
import type { CodeExample } from '@/lib/types';
import digits from '../../precision/precision-quantization/digits_mlp.json';

export const initial: GraphState = { batch: 8, prep: 'flat' };

/** The digits classifier from the precision lesson: 64 pixels → 16 hidden units → 10 digits. */
export const experiment = graphExperiment('graph', digits as DigitsModel, initial);

const st = (s: unknown) => s as GraphState;
const G = GRAPH_SOURCE;

export const graphCode: CodeExample = {
  id: 'graph-numpy',
  language: 'python',
  source: G,
  slots: {
    batch: (s) => graphSlots(st(s)).batch!,
    prep: (s) => graphSlots(st(s)).prep!,
  },
  annotations: [
    ann(G, 'transpose', 'W1, b1 =', '.T', {
      kind: 'framework',
      title: '.T (transpose)',
      what: 'The file stores weights as (out, in), like torch.nn.Linear. Transposing gives (in, out) = (64, 16).',
      why: 'With x as (batch, in), x @ W1 needs W1 as (in, out): the inner sizes must match.',
    }),
    ann(G, 'reshape-images', 'images = np.array', '.reshape(-1, 8, 8)', {
      kind: 'framework',
      title: '.reshape(-1, 8, 8)',
      what: 'Turns each row of 64 pixels into an 8 × 8 grid. -1 means “whatever size makes the total work”: here, the batch.',
      why: 'This is how the images would arrive from a camera or an image decoder, before preprocessing.',
    }),
    ann(G, 'prep', 'x = {{prep}}', '{{prep}}', {
      kind: 'math',
      title: 'Preprocessing',
      what: 'Must produce exactly what the model was trained on: shape (batch, 64), pixels divided by 16.',
      why: 'The shape is checked by the first matmul. The scale is checked by nothing: a wrong scale gives wrong answers silently.',
    }),
    ann(G, 'matmul', 'h = np.maximum', 'x @ W1', {
      kind: 'math',
      title: 'x @ W1: (batch, 64) @ (64, 16) → (batch, 16)',
      what: 'One matrix multiplication handles every image in the batch: each row of x is one image.',
      why: 'The batch dimension rides along. Only the last dimension of x has to match the first of W1.',
    }),
    ann(G, 'bias', 'h = np.maximum', '+ b1', {
      kind: 'math',
      title: '+ b1: broadcasting',
      what: 'b1 has shape (16,). NumPy adds it to every row of the (batch, 16) result.',
      why: 'Broadcasting lines shapes up from the right, so (batch, 16) + (16,) works for any batch size.',
    }),
    ann(G, 'argmax', 'labels = logits', 'axis=1', {
      kind: 'parameter',
      title: 'axis=1',
      what: 'Takes the largest of the 10 scores in each row, giving one label per image: shape (batch,).',
      why: 'axis=1 assumes a batch dimension at axis 0. Without one, the logits have only axis 0 and this raises.',
    }),
  ],
};

const O = `import onnx
import onnxruntime as ort
from onnx import TensorProto, helper, numpy_helper

# W1, b1, W2, b2 and images: float32 arrays loaded from digits_mlp.json as in the NumPy code
nodes = [
    helper.make_node("MatMul", ["x", "W1"], ["xw"]),
    helper.make_node("Add", ["xw", "b1"], ["z"]),
    helper.make_node("Relu", ["z"], ["h"]),
    helper.make_node("MatMul", ["h", "W2"], ["hw"]),
    helper.make_node("Add", ["hw", "b2"], ["logits"]),
]
x = helper.make_tensor_value_info("x", TensorProto.FLOAT, ["batch", 64])
y = helper.make_tensor_value_info("logits", TensorProto.FLOAT, ["batch", 10])
weights = [numpy_helper.from_array(a, name) for name, a in
           [("W1", W1), ("b1", b1), ("W2", W2), ("b2", b2)]]   # float32 arrays from digits_mlp.json
graph = helper.make_graph(nodes, "digits", [x], [y], weights)
model = helper.make_model(graph, opset_imports=[helper.make_opsetid("", 21)], ir_version=10)
onnx.save(model, "digits.onnx")

sess = ort.InferenceSession("digits.onnx", providers=["CPUExecutionProvider"])
inp = sess.get_inputs()[0]
print(inp.name, inp.shape, inp.type)
(logits,) = sess.run(None, {"x": images[:5]})        # (5, 64) float32, pixels / 16
print(logits.shape, logits.argmax(axis=1))
sess.run(None, {"x": images[:5].astype("float64")})`;

/** The same graph written explicitly as ONNX nodes and run by ONNX Runtime. */
export const onnxGraph: CodeExample = {
  id: 'graph-onnx',
  language: 'python',
  source: O,
  annotations: [
    annLine(O, 'node', 'helper.make_node("MatMul", ["x", "W1"]', {
      kind: 'framework',
      title: 'A node',
      what: 'One operation with named inputs and outputs. Edges are just names: "xw" is produced here and consumed by the next node.',
      why: 'A computational graph is this list of nodes. Runtimes can reorder, fuse or move them because the data flow is explicit.',
    }),
    ann(O, 'batch', 'x = helper.make_tensor_value_info', '["batch", 64]', {
      kind: 'parameter',
      title: 'A symbolic batch dimension',
      what: 'The first dimension is named "batch" instead of fixed, so any batch size is accepted.',
      why: 'If it were 1, the session would reject a batch of 5 with an INVALID_ARGUMENT error.',
    }),
    ann(O, 'ir', 'model = helper.make_model', 'ir_version=10', {
      kind: 'parameter',
      title: 'ir_version=10',
      what: 'The file-format version. onnx 1.23 writes version 14 by default, which onnxruntime 1.29 cannot load yet.',
      why: 'Pinning it keeps the file loadable by the runtime you deploy. The ONNX lesson returns to versioning.',
    }),
    ann(O, 'inputs', 'inp = sess.get_inputs()', 'sess.get_inputs()', {
      kind: 'framework',
      title: 'Ask the model what it expects',
      what: 'Each input has a name, a shape (with symbolic names for dynamic dimensions) and an element type.',
      why: 'A server can check every request against this before running the model.',
      output: "x ['batch', 64] tensor(float)",
    }),
  ],
};

export const onnxOutput: CodeExample = {
  id: 'graph-onnx-output',
  language: 'bash',
  source: `python digits_onnx.py
# x ['batch', 64] tensor(float)
# (5, 10) [7 6 3 7 7]
# onnxruntime.capi.onnxruntime_pybind11_state.InvalidArgument: [ONNXRuntimeError] : 2 : INVALID_ARGUMENT :
#   Unexpected input data type. Actual: (tensor(double)) , expected: (tensor(float))`,
  annotations: [],
};

export const fixedBatchOutput: CodeExample = {
  id: 'graph-onnx-fixed',
  language: 'bash',
  source: `# the same model exported with the batch dimension fixed to 1, given a batch of 5
# InvalidArgument: [ONNXRuntimeError] : 2 : INVALID_ARGUMENT : Got invalid dimensions for input: x for the following indices
#  index: 0 Got: 5 Expected: 1
#  Please fix either the inputs/outputs or the model.`,
  annotations: [],
};

export const fixedBatchError = `[ONNXRuntimeError] : 2 : INVALID_ARGUMENT : Got invalid dimensions for input: x for the following indices
 index: 0 Got: 5 Expected: 1
 Please fix either the inputs/outputs or the model.`;


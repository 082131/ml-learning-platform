import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the inference/runtimes chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'onnx',
    term: 'ONNX',
    short: 'Open Neural Network Exchange: a file format that stores a model as a graph of standard operators plus its weights.',
    long: 'Each operator (MatMul, Relu, Softmax, …) is defined by the ONNX specification at a given opset version, so any runtime that implements that opset can run the file, independent of the framework that trained the model.',
    introducedIn: 'inference/runtimes/onnx-serving',
    aliases: ['.onnx', 'opset'],
  },
  {
    id: 'execution-provider',
    term: 'Execution provider',
    short: 'An ONNX Runtime backend that runs (part of) a graph on specific hardware, such as CPU, CUDA, TensorRT or OpenVINO.',
    long: 'Providers are tried in the order you list them; nodes a provider cannot run fall back to the next one, usually the CPU provider. Each fallback adds copies between devices.',
    introducedIn: 'inference/runtimes/onnx-serving',
    aliases: ['EP', 'CUDAExecutionProvider', 'CPUExecutionProvider'],
  },
  {
    id: 'operator-fusion',
    term: 'Operator fusion',
    short: 'Replacing several graph nodes with one kernel that does all their work, such as MatMul + Add + Relu.',
    long: 'The fused kernel keeps intermediate values in registers or cache instead of writing them to memory and reading them back, and saves one launch per removed node.',
    introducedIn: 'inference/runtimes/onnx-serving',
    aliases: ['kernel fusion', 'fusion'],
  },
  {
    id: 'constant-folding',
    term: 'Constant folding',
    short: 'Computing, once at load time, every part of a graph whose inputs are all constants.',
    long: 'An exported graph often transposes or reshapes a weight on every call. Folding stores the result as a new constant, so the operation disappears from the graph.',
    introducedIn: 'inference/runtimes/onnx-serving',
  },
] satisfies GlossaryTerm[];

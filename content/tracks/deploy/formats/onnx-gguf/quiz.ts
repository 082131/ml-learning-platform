import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'which-format',
    type: 'choice',
    prompt: 'You will run a 7B chat model on laptops with llama.cpp. Which format do you ship?',
    options: [
      {
        text: 'An ONNX file, since ONNX Runtime and llama.cpp both read it',
        correct: false,
        explain: 'llama.cpp does not read ONNX. ONNX is the usual choice for ONNX Runtime, TensorRT and many non-LLM models.',
      },
      {
        text: 'A PyTorch .pt checkpoint plus the tokenizer folder',
        correct: false,
        explain: 'llama.cpp cannot load PyTorch checkpoints, and pickle-based files can run code when loaded.',
      },
      {
        text: 'One quantized .gguf file, which already contains the tokenizer and settings',
        correct: true,
        explain: 'GGUF is llama.cpp’s format. Convert once with convert_hf_to_gguf.py and quantize with llama-quantize.',
      },
    ],
  },
  {
    id: 'onnx-content',
    type: 'choice',
    prompt: 'What does an ONNX file contain that a safetensors file does not?',
    options: [
      {
        text: 'The computation graph: the operators and how tensors flow between them',
        correct: true,
        explain:
          'safetensors stores only named tensors; you need the model’s Python code to use them. ONNX stores the graph too, so a runtime can execute it without that code.',
      },
      {
        text: 'Quantized weights, which safetensors cannot store',
        correct: false,
        explain: 'safetensors stores integer tensors fine (GPTQ and AWQ models use it). Quantization is not the difference.',
      },
      {
        text: 'The tokenizer, so text can be passed in directly',
        correct: false,
        explain: 'Standard ONNX models take token IDs; the tokenizer runs separately (unless you add extension operators). GGUF is the format that bundles one.',
      },
    ],
  },
  {
    id: 'offset',
    type: 'numeric',
    prompt:
      'A GGUF header (with tensor infos) ends at byte 1,000 and the alignment is 32. A tensor’s info says offset 64. At which byte of the file does its data start?',
    answer: 1088,
    tolerance: 0,
    hint: 'Round 1,000 up to a multiple of 32 to find where the data section starts, then add the offset.',
    explain: '1,000 rounds up to 1,024 (32 × 32). 1,024 + 64 = 1,088.',
  },
  {
    id: 'endianness',
    type: 'numeric',
    prompt: 'The 8 bytes after the version are 02 00 00 00 00 00 00 00. As a little-endian uint64, what number is that?',
    answer: 2,
    tolerance: 0,
    hint: 'Little-endian: the first byte is the least significant.',
    explain: 'Only the lowest byte is non-zero: the file has 2 tensors.',
  },
];

export const headerExercise: Exercise = {
  id: 'gguf-header',
  prompt:
    'Write `header(data)` that checks the magic and returns `(version, tensor_count, kv_count)` from the first 24 bytes of a GGUF file.',
  starter: `import struct


def header(data):
    pass`,
  hints: [
    'data[:4] must equal b"GGUF"; raise ValueError otherwise.',
    'struct.unpack_from("<IQQ", data, 4) reads a uint32 and two uint64s, little-endian, from byte 4.',
  ],
  solution: `import struct


def header(data):
    if data[:4] != b"GGUF":
        raise ValueError("not a GGUF file")
    return struct.unpack_from("<IQQ", data, 4)`,
  explanation:
    'These 24 bytes are the same in every GGUF file. A loader reads them first to know how many metadata pairs and tensor descriptions follow.',
  tests: `demo = bytes.fromhex("47475546030000000200000000000000030000000000000014")
assert header(demo) == (3, 2, 3), 'demo.gguf: version 3, 2 tensors, 3 key-value pairs'
other = b"GGUF" + (3).to_bytes(4, "little") + (291).to_bytes(8, "little") + (24).to_bytes(8, "little")
assert header(other) == (3, 291, 24), 'counts are little-endian uint64'
try:
    header(b"PK\\x03\\x04" + bytes(20))
    raise AssertionError('a zip file (such as a PyTorch .pt) should be rejected')
except ValueError:
    pass`,
};

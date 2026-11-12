// Code for the model formats lesson. make_demo_gguf.py and make_tiny.py ran with gguf 0.19.0 and NumPy 2.5.4;
// the GGUF reader's printout is checked against CPython 3.13 in src/lib/deploy/gguf.test.ts, and its offsets
// against gguf.GGUFReader. The llama.cpp loader log was recorded with llama-cpp-python 0.3.36.
import { annLine } from '@/lib/inference/annotate';
import { DEMO_HEX, GGUF_SOURCE, ggufExperiment } from '@/lib/deploy/gguf';
import type { CodeExample } from '@/lib/types';
import demoSource from './make_demo_gguf.py?raw';
import tinySource from './make_tiny.py?raw';

export const experiment = ggufExperiment('gguf', { part: 'kv-0' });

const D = demoSource.replace(/\n$/, '');
export const makeDemo: CodeExample = {
  id: 'make-demo-gguf',
  language: 'python',
  source: D,
  annotations: [
    annLine(D, 'writer', 'w = GGUFWriter("demo.gguf", "demo")', {
      kind: 'framework',
      title: 'GGUFWriter',
      what: 'The writer from the gguf package, the same code llama.cpp’s converter uses. The second argument becomes general.architecture.',
      why: 'llama.cpp chooses how to build the network from general.architecture, then reads keys prefixed with it, such as demo.block_count.',
    }),
    annLine(D, 'kv', 'w.add_uint32("demo.block_count", 1)', {
      kind: 'framework',
      title: 'A typed key-value pair',
      what: 'Each metadata value is stored with its type: here uint32 (type code 4).',
      why: 'Hyperparameters, the tokenizer and the chat template all live in these pairs, so the file is self-contained.',
    }),
    annLine(D, 'q8', 'w.add_tensor("proj.weight", quants.quantize(', {
      kind: 'framework',
      title: 'A quantized tensor',
      what: '32 weights quantized to Q8_0: 2 bytes of scale and 32 bytes of integers, 34 bytes in all.',
      why: 'GGUF stores quantized blocks as they are; nothing is dequantized when the file is loaded.',
    }),
  ],
};

const T = tinySource.replace(/\n$/, '');
export const makeTiny: CodeExample = {
  id: 'make-tiny-llama',
  language: 'python',
  source: T,
  annotations: [
    annLine(T, 'arch', 'w = GGUFWriter("tiny-llama-f32.gguf", "llama")', {
      kind: 'framework',
      title: 'Architecture llama',
      what: 'Declares the file a Llama model, so llama.cpp builds a Llama network from it.',
      why: 'The converter for a real Hugging Face checkpoint writes exactly these keys, read from config.json.',
    }),
    annLine(T, 'hp', 'w.add_head_count(H); w.add_head_count_kv(HKV)', {
      kind: 'parameter',
      title: 'Grouped-query attention',
      what: '8 query heads share 4 key/value heads.',
      why: 'These keys are why one .gguf is enough: the shapes of every tensor follow from them.',
    }),
    annLine(T, 'tok', 'w.add_token_list(n_vocab_pieces)', {
      kind: 'framework',
      title: 'The tokenizer inside the file',
      what: '269 tokens: three special tokens, 256 byte tokens and ten words.',
      why: 'A real model stores its full vocabulary (128,256 tokens for Llama 3) and merge rules here.',
    }),
    annLine(T, 'names', 'p + "attn_q.weight"', {
      kind: 'variable',
      title: 'GGUF tensor names',
      what: 'blk.N.attn_q.weight and so on: llama.cpp’s naming, not Hugging Face’s (model.layers.N.self_attn.q_proj.weight).',
      why: 'Renaming tensors is a large part of what convert_hf_to_gguf.py does.',
    }),
  ],
};

export const readerCode: CodeExample = {
  id: 'gguf-reader',
  language: 'python',
  source: GGUF_SOURCE,
  slots: { hex: () => DEMO_HEX },
  annotations: [
    annLine(GGUF_SOURCE, 'read', 'def read(fmt):', {
      kind: 'function',
      title: 'Little-endian reads',
      what: '"<I" is a 4-byte unsigned integer, "<Q" an 8-byte one, least significant byte first.',
      why: 'Every number in a GGUF header is little-endian, which is why 03 00 00 00 means version 3.',
    }),
    annLine(GGUF_SOURCE, 'string', 'def string():', {
      kind: 'function',
      title: 'GGUF strings',
      what: 'An 8-byte length followed by that many UTF-8 bytes, with no terminating zero.',
      why: 'general.architecture costs 8 + 20 bytes for the key, 4 for the type, then 8 + 4 for "demo": 44 bytes.',
    }),
    annLine(GGUF_SOURCE, 'info', 'dims = [read("Q") for _ in range(read("I"))]', {
      kind: 'framework',
      title: 'Tensor info: dims',
      what: 'The number of dimensions, then each one, innermost (fastest-changing) first.',
      why: 'proj.weight shows [32, 1]: ggml lists dimensions in the opposite order to NumPy’s shape (1, 32).',
    }),
    annLine(GGUF_SOURCE, 'align', 'data_start = -(-at // 32) * 32', {
      kind: 'math',
      title: 'Alignment',
      what: 'Rounds the end of the header up to the next multiple of 32: in demo.gguf, 235 becomes 256.',
      why: 'Aligned tensor data can be memory-mapped and read with vector instructions directly.',
    }),
    annLine(GGUF_SOURCE, 'offset', 'show(data_start + offset', {
      kind: 'math',
      title: 'Offsets are relative',
      what: 'A tensor’s offset counts from the start of the data section, not from the start of the file.',
      why: 'proj.weight has offset 32, so it starts at 256 + 32 = 288. Each tensor is itself aligned to 32.',
    }),
  ],
};

export const loaderLog: CodeExample = {
  id: 'llama-loader-log',
  language: 'bash',
  source: `# llama.cpp's log while loading tiny-llama-f32.gguf (made by make_tiny.py), spaces trimmed
llama_model_loader: loaded meta data with 18 key-value pairs and 75 tensors from tiny-llama-f32.gguf (version GGUF V3 (latest))
llama_model_loader: - kv   0:  general.architecture str = llama
llama_model_loader: - kv   1:  general.name str = tiny-llama-random
llama_model_loader: - kv   4:  llama.block_count u32 = 8
llama_model_loader: - kv   6:  llama.attention.head_count u32 = 8
llama_model_loader: - kv   7:  llama.attention.head_count_kv u32 = 4
llama_model_loader: - kv  11:  tokenizer.ggml.model str = llama
llama_model_loader: - kv  12:  tokenizer.ggml.tokens arr[str,269] = ["<unk>", "<s>", "</s>", "<0x00>", "<...
llama_model_loader: - kv  15:  tokenizer.ggml.bos_token_id u32 = 1
llama_model_loader: - type  f32:   75 tensors`,
  annotations: [],
};

export const convertCommands: CodeExample = {
  id: 'convert-hf-gguf',
  language: 'bash',
  source: `# Not run here: the build container cannot download models or llama.cpp's repository.
git clone https://github.com/ggml-org/llama.cpp && cd llama.cpp
pip install -r requirements.txt
cmake -B build && cmake --build build --config Release -j

# 1. Hugging Face folder (config.json, tokenizer, *.safetensors) -> one GGUF file in BF16
python convert_hf_to_gguf.py ~/models/Llama-3.2-1B-Instruct --outtype bf16 --outfile llama-1b-bf16.gguf

# 2. Quantize from the 16-bit file (never from an already quantized one)
./build/bin/llama-quantize llama-1b-bf16.gguf llama-1b-Q4_K_M.gguf Q4_K_M

# 3. Inspect what you made
python -c "from gguf import GGUFReader; r = GGUFReader('llama-1b-Q4_K_M.gguf'); print(len(r.tensors), 'tensors')"`,
  annotations: [],
};

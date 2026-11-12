"""Write a small Llama-architecture GGUF file with random weights (to demonstrate the tools, not to generate text)."""
import numpy as np
from gguf import GGUFWriter, TokenType

rng = np.random.default_rng(0)
n_vocab_pieces = ["<unk>", "<s>", "</s>"] + [f"<0x{b:02X}>" for b in range(256)] + ["▁" + w for w in "the a model is on edge server quantized fast small".split()]
V, D, L, FF, H, HKV = len(n_vocab_pieces), 512, 8, 1536, 8, 4
w = GGUFWriter("tiny-llama-f32.gguf", "llama")
w.add_name("tiny-llama-random")
w.add_context_length(512); w.add_embedding_length(D); w.add_block_count(L)
w.add_feed_forward_length(FF); w.add_head_count(H); w.add_head_count_kv(HKV)
w.add_rope_dimension_count(D // H); w.add_layer_norm_rms_eps(1e-5); w.add_file_type(0)
w.add_tokenizer_model("llama")
w.add_token_list(n_vocab_pieces)
w.add_token_scores([0.0] * V)
types = [TokenType.UNKNOWN, TokenType.CONTROL, TokenType.CONTROL] + [TokenType.BYTE] * 256 + [TokenType.NORMAL] * (V - 259)
w.add_token_types(types)
w.add_bos_token_id(1); w.add_eos_token_id(2); w.add_unk_token_id(0)

def t(*shape):
    return (rng.standard_normal(shape) * 0.02).astype(np.float32)

w.add_tensor("token_embd.weight", t(V, D))
for i in range(L):
    p = f"blk.{i}."
    w.add_tensor(p + "attn_norm.weight", np.ones(D, np.float32))
    w.add_tensor(p + "attn_q.weight", t(D, D))
    w.add_tensor(p + "attn_k.weight", t(D * HKV // H, D))
    w.add_tensor(p + "attn_v.weight", t(D * HKV // H, D))
    w.add_tensor(p + "attn_output.weight", t(D, D))
    w.add_tensor(p + "ffn_norm.weight", np.ones(D, np.float32))
    w.add_tensor(p + "ffn_gate.weight", t(FF, D))
    w.add_tensor(p + "ffn_up.weight", t(FF, D))
    w.add_tensor(p + "ffn_down.weight", t(D, FF))
w.add_tensor("output_norm.weight", np.ones(D, np.float32))
w.add_tensor("output.weight", t(V, D))
w.write_header_to_file(); w.write_kv_data_to_file(); w.write_tensors_to_file(); w.close()

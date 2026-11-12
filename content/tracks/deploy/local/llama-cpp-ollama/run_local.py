from llama_cpp import Llama

llm = Llama(
    model_path="tiny-llama-Q4_K_M.gguf",
    n_ctx=512,          # context window to allocate (llama-cli -c)
    n_threads=4,        # CPU threads (-t)
    n_gpu_layers=0,     # layers to offload to a GPU (-ngl); this build has none
    verbose=False,
)
out = llm("the model", max_tokens=8, temperature=0.0)
print(repr(out["choices"][0]["text"]), out["choices"][0]["finish_reason"])
print(llm.n_ctx(), "tokens of context,", llm.n_vocab(), "tokens in the vocabulary")

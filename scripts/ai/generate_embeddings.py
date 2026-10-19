"""Generates the embedding tables and tokenizer fixtures bundled with the AI track lessons.

Model: sentence-transformers/all-MiniLM-L6-v2 (Apache-2.0), 384 dimensions, as the ONNX export that
Chroma distributes (https://chroma-onnx-models.s3.amazonaws.com/all-MiniLM-L6-v2/onnx.tar.gz,
sha256 913d7300…, built from Hugging Face snapshot 7dbbc90392e2f80f3d3c277d6e90027e55de9125).
Embedding = mean of the last hidden states over real tokens (attention mask), then L2-normalized,
which is what sentence-transformers does for this model. The script checks that it reproduces the
similarities published in the sentence-transformers README before writing anything.

Run (Python 3.13, onnxruntime 1.29.0, tokenizers 0.23.3, numpy 2.5.3):
    python3 -m pip install onnxruntime tokenizers numpy
    python3 scripts/ai/generate_embeddings.py [path/to/onnx-folder]
Without a folder argument it downloads and verifies the archive into ~/.cache/lumen-minilm.
"""

import base64
import hashlib
import json
import sys
import tarfile
import urllib.request
from pathlib import Path

import numpy as np
import onnxruntime as ort
from tokenizers import Tokenizer

ARCHIVE_URL = "https://chroma-onnx-models.s3.amazonaws.com/all-MiniLM-L6-v2/onnx.tar.gz"
ARCHIVE_SHA256 = "913d7300ceae3b2dbc2c50d1de4baacab4be7b9380491c27fab7418616a16ec3"
MODEL_SHA256 = "4f148ba8ae9c2c7fbee4af2b132db8d06c6a6545b47fc83bbb98c3d22b8393e6"
# sentence-transformers uses max_seq_length 256 for this model; the archive's tokenizer.json says 128.
MAX_TOKENS = 256
DATA = Path(__file__).resolve().parents[2] / "src" / "lib" / "ai" / "data"
# Must match CHUNK_SIZES and CHUNK_OVERLAPS in src/lib/ai/chunking.ts.
CHUNK_SIZES = [20, 40, 80]
CHUNK_OVERLAPS = [0, 10]

MODEL_INFO = {
    "name": "sentence-transformers/all-MiniLM-L6-v2",
    "revision": "7dbbc90392e2f80f3d3c277d6e90027e55de9125",
    "format": "ONNX export distributed by Chroma (onnx.tar.gz, sha256 913d7300ceae)",
    "license": "Apache-2.0",
    "dimensions": 384,
    "pooling": "mean over tokens, then L2-normalized",
    "runtime": "onnxruntime 1.29.0, tokenizers 0.23.3, Python 3.13",
    "storage": "float16, base64, little-endian",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def model_folder() -> Path:
    if len(sys.argv) > 1:
        return Path(sys.argv[1])
    cache = Path.home() / ".cache" / "lumen-minilm"
    folder = cache / "onnx"
    if not (folder / "model.onnx").exists():
        cache.mkdir(parents=True, exist_ok=True)
        archive = cache / "onnx.tar.gz"
        urllib.request.urlretrieve(ARCHIVE_URL, archive)
        if sha256(archive) != ARCHIVE_SHA256:
            raise SystemExit("archive checksum mismatch")
        with tarfile.open(archive) as tar:
            tar.extractall(cache, filter="data")
    return folder


class Embedder:
    def __init__(self, folder: Path):
        if sha256(folder / "model.onnx") != MODEL_SHA256:
            raise SystemExit("model.onnx checksum mismatch")
        self.tok = Tokenizer.from_file(str(folder / "tokenizer.json"))
        self.tok.enable_truncation(MAX_TOKENS)
        self.tok.enable_padding()
        self.session = ort.InferenceSession(str(folder / "model.onnx"))

    def __call__(self, texts: list[str]) -> np.ndarray:
        for t in texts:
            n = len(self.tok.encode(t).ids)
            if n >= MAX_TOKENS:
                raise SystemExit(f"text would be truncated ({n} tokens): {t[:60]}")
        enc = self.tok.encode_batch(texts)
        ids = np.array([e.ids for e in enc], dtype=np.int64)
        mask = np.array([e.attention_mask for e in enc], dtype=np.int64)
        hidden = self.session.run(
            None, {"input_ids": ids, "attention_mask": mask, "token_type_ids": np.zeros_like(ids)}
        )[0]
        summed = (hidden * mask[..., None]).sum(axis=1)
        mean = summed / mask.sum(axis=1, keepdims=True)
        return mean / np.linalg.norm(mean, axis=1, keepdims=True)


def check_reference(embed: Embedder) -> None:
    """The similarities printed in the sentence-transformers README for these three sentences."""
    e = embed(["The weather is lovely today.", "It's so sunny outside!", "He drove to the stadium."])
    sims = np.round(e @ e.T, 4)
    expected = np.array([[1.0, 0.6660, 0.1046], [0.6660, 1.0, 0.1411], [0.1046, 0.1411, 1.0]])
    if not np.allclose(sims, expected, atol=1e-4):
        raise SystemExit(f"reference similarities differ:\n{sims}")


def chunk_words(text: str, size: int, overlap: int) -> list[str]:
    """Same rule as chunkWords in src/lib/ai/chunking.ts: windows of `size` words, `overlap` shared."""
    words = text.split()
    stride = size - overlap
    chunks = []
    start = 0
    while True:
        chunks.append(" ".join(words[start : start + size]))
        if start + size >= len(words):
            return chunks
        start += stride


def pack(vectors: np.ndarray) -> tuple[str, float]:
    """float16 bytes as base64, plus the largest cosine error that rounding to float16 causes."""
    half = vectors.astype("<f2")
    restored = half.astype(np.float64)
    restored /= np.linalg.norm(restored, axis=1, keepdims=True)
    error = float(np.abs(restored @ restored.T - vectors @ vectors.T).max())
    return base64.b64encode(half.tobytes()).decode(), error


def write(name: str, payload: dict) -> None:
    path = DATA / name
    path.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"{name}: {path.stat().st_size / 1024:.1f} KB")


def main() -> None:
    folder = model_folder()
    embed = Embedder(folder)
    check_reference(embed)
    corpus = json.loads((DATA / "corpus.json").read_text())

    items = [{"id": s["id"], "text": s["text"], "kind": "sentence"} for s in corpus["sentences"]]
    items += [{"id": q["id"], "text": q["text"], "kind": "query"} for q in corpus["queries"]]
    vectors, error = pack(embed([i["text"] for i in items]))
    write("sentence-embeddings.json", {"model": MODEL_INFO, "float16MaxCosineError": round(error, 6),
                                       "items": items, "vectors": vectors})

    chunks: list[str] = []
    for doc in corpus["docs"]:
        for size in CHUNK_SIZES:
            for overlap in CHUNK_OVERLAPS:
                for c in chunk_words(doc["text"], size, overlap):
                    if c not in chunks:
                        chunks.append(c)
    texts = chunks + [q["text"] for q in corpus["ragQueries"]]
    vectors, error = pack(embed(texts))
    write("rag-embeddings.json", {"model": MODEL_INFO, "float16MaxCosineError": round(error, 6),
                                  "chunkSizes": CHUNK_SIZES, "chunkOverlaps": CHUNK_OVERLAPS,
                                  "texts": texts, "vectors": vectors})

    # Reference tokenizations for the TypeScript WordPiece tests (special tokens included).
    tok = Tokenizer.from_file(str(folder / "tokenizer.json"))
    tok.no_truncation()
    tok.no_padding()
    samples = [
        "Tokenizers split unbelievably long words into pieces.",
        "The movie was not good.",
        "Café déjà vu, naïve résumé!",
        "GPT-4o costs $2.50 per 1M tokens (as of 2025).",
        "E-402: storage quota is full",
        "日本語のテキスト and emoji 🙂 here",
        "don't stop, it's fine... really?!",
        "a" * 101 + " short",
        "   spaces\tand\nnewlines   ",
        "transformers tokenization embeddings",
    ]
    fixtures = []
    for text in samples:
        e = tok.encode(text)
        fixtures.append({"text": text, "tokens": e.tokens, "ids": e.ids, "printed": str(e.tokens)})
    write("wordpiece-fixtures.json", {"tokenizer": "all-MiniLM-L6-v2 tokenizer.json, tokenizers 0.23.3",
                                      "cases": fixtures})
    (DATA / "vocab.txt").write_bytes((folder / "vocab.txt").read_bytes())
    print("vocab.txt copied")


if __name__ == "__main__":
    main()

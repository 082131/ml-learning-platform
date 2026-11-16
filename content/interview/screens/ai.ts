import type { ScreenDef } from '@/lib/interview/types';

const NOT_DONE = 'raise NotImplementedError';

// AI engineer screens ask for the plumbing of an LLM application: retrieval, chunking, fusion. No model calls.
export const aiScreen: ScreenDef = {
  id: 'ai',
  role: 'ai',
  title: 'AI engineer coding screen',
  summary:
    'Three building blocks of a retrieval pipeline, the kind of practical task AI engineer screens use in place of puzzle problems: vector search, chunking and rank fusion.',
  minutes: 50,
  passPercent: 70,
  tasks: [
    {
      id: 'scr-ai-topk',
      title: 'Cosine top-k retrieval',
      domain: 'ai',
      brief: `Write \`top_k(query, docs, k)\`. \`query\` is a (d,) array and \`docs\` an (n, d) array of embeddings, not normalized.

Return a list of \`(index, score)\` for the \`k\` documents with the highest cosine similarity, best first, with ties broken by the lower index. A document whose vector is all zeros has similarity 0. If \`k\` exceeds \`n\`, return all \`n\`. Use vectorized NumPy, not a Python loop over documents; scores are Python floats.`,
      starter: `import numpy as np

def top_k(query, docs, k):
    ${NOT_DONE}
`,
      solution: `import numpy as np

def top_k(query, docs, k):
    q = np.asarray(query, dtype=float)
    D = np.asarray(docs, dtype=float)
    norms = np.linalg.norm(D, axis=1) * np.linalg.norm(q)
    dots = D @ q
    sims = np.divide(dots, norms, out=np.zeros_like(dots), where=norms > 0)
    order = np.lexsort((np.arange(len(sims)), -sims))[:k]
    return [(int(i), float(sims[i])) for i in order]
`,
      checks: [
        {
          name: 'Ranks by angle, not by length',
          points: 12,
          tests: `import numpy as np
_docs = np.array([[10.0, 0.0], [1.0, 1.0], [0.0, 3.0], [-1.0, 0.0]])
_out = top_k(np.array([0.0, 2.0]), _docs, 2)
assert [i for i, _ in _out] == [2, 1], f"got {_out}"
assert abs(_out[0][1] - 1.0) < 1e-9 and abs(_out[1][1] - 2 ** -0.5) < 1e-9, f"scores were {[s for _, s in _out]}"
assert all(type(s) is float and type(i) is int for i, s in _out), "return Python ints and floats"
`,
        },
        {
          name: 'Zero vectors, ties and k larger than n',
          points: 12,
          tests: `import numpy as np, warnings
warnings.simplefilter("error")
_docs = np.array([[0.0, 0.0], [2.0, 0.0], [1.0, 0.0], [0.0, 1.0]])
_out = top_k(np.array([1.0, 0.0]), _docs, 10)
assert [i for i, _ in _out] == [1, 2, 0, 3], f"got {[i for i, _ in _out]}"
assert _out[2][1] == 0.0, "a zero vector has similarity 0, not NaN"
assert top_k(np.array([1.0, 0.0]), _docs, 0) == []
`,
        },
        {
          name: 'Matches a reference on 50,000 vectors',
          points: 9,
          tests: `import numpy as np, time
_rng = np.random.default_rng(5)
_D = _rng.normal(0, 1, (50_000, 64)); _q = _rng.normal(0, 1, 64)
_t = time.perf_counter()
_out = top_k(_q, _D, 5)
assert time.perf_counter() - _t < 10, "too slow: vectorize over the documents"
_s = (_D @ _q) / (np.linalg.norm(_D, axis=1) * np.linalg.norm(_q))
_ref = np.argsort(-_s)[:5]
assert [i for i, _ in _out] == list(_ref), "wrong documents"
assert np.allclose([s for _, s in _out], _s[_ref])
`,
        },
      ],
    },
    {
      id: 'scr-ai-chunk',
      title: 'Chunk text with overlap',
      domain: 'ai',
      brief: `Write \`chunk_words(text, size, overlap)\`. Split \`text\` on whitespace into words and return a list of chunks, each a string of at most \`size\` words joined by single spaces.

Each chunk starts \`size - overlap\` words after the previous one, so consecutive chunks share \`overlap\` words. Stop as soon as a chunk reaches the last word: there must be no trailing chunk made only of words already covered. Empty or whitespace-only text gives an empty list.

Raise \`ValueError\` unless \`size > 0\` and \`0 <= overlap < size\`.`,
      starter: `def chunk_words(text, size, overlap):
    ${NOT_DONE}
`,
      solution: `def chunk_words(text, size, overlap):
    if size <= 0 or overlap < 0 or overlap >= size:
        raise ValueError("need size > 0 and 0 <= overlap < size")
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        chunks.append(" ".join(words[start:start + size]))
        if start + size >= len(words):
            break
        start += size - overlap
    return chunks
`,
      checks: [
        {
          name: 'Windows of the right size and overlap',
          points: 12,
          tests: `_t = "a b c d e f g h i j"
assert chunk_words(_t, 4, 1) == ["a b c d", "d e f g", "g h i j"], f"got {chunk_words(_t, 4, 1)}"
assert chunk_words(_t, 5, 0) == ["a b c d e", "f g h i j"]
assert chunk_words(_t, 4, 2) == ["a b c d", "c d e f", "e f g h", "g h i j"], f"got {chunk_words(_t, 4, 2)}"
assert chunk_words("  one\\n two\\tthree  ", 2, 0) == ["one two", "three"], "split on any whitespace"
`,
        },
        {
          name: 'No trailing chunk of already-covered words',
          points: 12,
          tests: `assert chunk_words("a b c d e", 4, 3) == ["a b c d", "b c d e"], f"got {chunk_words('a b c d e', 4, 3)}"
assert chunk_words("a b c", 10, 2) == ["a b c"], "short text is one chunk"
assert chunk_words("a b c d", 4, 1) == ["a b c d"], "text that fits exactly is one chunk"
assert chunk_words("", 3, 1) == [] and chunk_words("   ", 3, 1) == []
_w = [str(i) for i in range(1000)]
_c = chunk_words(" ".join(_w), 64, 16)
assert _c[-1].split()[-1] == "999" and all(len(c.split()) <= 64 for c in _c)
assert all(a.split()[-16:] == b.split()[:16] for a, b in zip(_c, _c[1:])), "consecutive chunks share exactly the overlap"
`,
        },
        {
          name: 'Rejects impossible settings',
          points: 9,
          tests: `for _size, _ov in ((0, 0), (4, 4), (4, 5), (4, -1), (-2, 0)):
    try:
        chunk_words("a b c", _size, _ov)
    except ValueError:
        pass
    else:
        raise AssertionError(f"size={_size}, overlap={_ov} should raise ValueError")
`,
        },
      ],
    },
    {
      id: 'scr-ai-rrf',
      title: 'Reciprocal rank fusion',
      domain: 'ai',
      brief: `Hybrid search runs a keyword retriever and a vector retriever, then merges their ranked lists. Their scores are not comparable, so fuse by rank.

Write \`rrf(rankings, k=60, top=None)\`. \`rankings\` is a list of ranked lists of document ids, best first. A document's fused score is the sum over the lists that contain it of \`1 / (k + rank)\`, where \`rank\` starts at 1. If an id appears more than once in one list, only its best position counts.

Return a list of \`(doc_id, score)\` sorted by score descending, ties broken by \`doc_id\` ascending, cut to the first \`top\` items when \`top\` is given.`,
      starter: `def rrf(rankings, k=60, top=None):
    ${NOT_DONE}
`,
      solution: `def rrf(rankings, k=60, top=None):
    scores = {}
    for ranking in rankings:
        seen = set()
        for rank, doc in enumerate(ranking, start=1):
            if doc in seen:
                continue
            seen.add(doc)
            scores[doc] = scores.get(doc, 0.0) + 1.0 / (k + rank)
    fused = sorted(scores.items(), key=lambda kv: (-kv[1], kv[0]))
    return fused if top is None else fused[:top]
`,
      checks: [
        {
          name: 'Agreement between lists beats one high rank',
          points: 14,
          tests: `_out = rrf([["a", "b", "c"], ["b", "d", "a"]])
assert [d for d, _ in _out] == ["b", "a", "d", "c"], f"got {[d for d, _ in _out]}"
assert abs(_out[0][1] - (1 / 62 + 1 / 61)) < 1e-12 and abs(_out[1][1] - (1 / 61 + 1 / 63)) < 1e-12
assert abs(dict(_out)["c"] - 1 / 63) < 1e-12
`,
        },
        {
          name: 'k, top and tie-breaking',
          points: 10,
          tests: `_out = rrf([["x", "y"], ["y", "x"]], k=1)
assert _out == [("x", 1 / 2 + 1 / 3), ("y", 1 / 2 + 1 / 3)], f"tied scores are ordered by id, got {_out}"
assert [d for d, _ in rrf([["a", "b", "c"], ["c", "b", "a"]], k=0, top=2)] == ["a", "c"], "with k=0 the top ranks dominate"
assert rrf([]) == [] and rrf([[], []]) == []
`,
        },
        {
          name: 'A repeated id counts once per list',
          points: 10,
          tests: `_out = dict(rrf([["a", "a", "b"]], k=10))
assert abs(_out["a"] - 1 / 11) < 1e-12, "only the best position of a repeated id counts"
assert abs(_out["b"] - 1 / 13) < 1e-12, "positions after a repeat keep their place in the list"
`,
        },
      ],
    },
  ],
};

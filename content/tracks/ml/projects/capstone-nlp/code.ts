// Code for ml/projects/capstone-nlp. search.py uses only the standard library; it was run with CPython 3.13.16
// on the three-file demo corpus described in the lesson, and the output shown is from that run.
import type { CodeExample, ProjectBrief } from '@/lib/types';

export const setupCode: CodeExample = {
  id: 'capstone-nlp-setup',
  language: 'bash',
  source: `python3 -m venv .venv
source .venv/bin/activate            # Windows: .venv\\Scripts\\activate
pip install sentence-transformers==6.2.0 scikit-learn==1.9.1   # for milestone 4; search.py needs none
# download the plain-text Python documentation from https://docs.python.org/3/download.html
# and unpack it into docs/
python search.py --docs docs --queries queries.jsonl --k 5`,
  annotations: [],
};

export const searchCode: CodeExample = {
  id: 'capstone-nlp-search',
  language: 'python',
  source: `import argparse
import json
import math
import re
from collections import Counter
from pathlib import Path

TOKEN = re.compile(r"[a-z0-9_]+")

def tokenize(text):
    return TOKEN.findall(text.lower())

def load_passages(folder, min_words=40):
    """Split every .txt file into passages of whole paragraphs with at least min_words words."""
    passages = []
    for path in sorted(Path(folder).rglob("*.txt")):
        name = path.relative_to(folder).as_posix()
        current = []
        for para in re.split(r"\\n\\s*\\n", path.read_text(encoding="utf-8")):
            current.append(para.strip())
            if len(" ".join(current).split()) >= min_words:
                passages.append((name, " ".join(current)))
                current = []
        if current:
            passages.append((name, " ".join(current)))
    return passages

class BM25:
    def __init__(self, texts, k1=1.5, b=0.75):
        self.docs = [Counter(tokenize(t)) for t in texts]
        self.lengths = [sum(d.values()) for d in self.docs]
        self.avg = sum(self.lengths) / len(self.docs)
        df = Counter(term for d in self.docs for term in d)
        n = len(self.docs)
        self.idf = {t: math.log(1 + (n - f + 0.5) / (f + 0.5)) for t, f in df.items()}
        self.k1, self.b = k1, b

    def scores(self, query):
        out = []
        for d, length in zip(self.docs, self.lengths):
            s = 0.0
            for term in tokenize(query):
                tf = d.get(term, 0)
                if tf:
                    norm = tf + self.k1 * (1 - self.b + self.b * length / self.avg)
                    s += self.idf[term] * tf * (self.k1 + 1) / norm
            out.append(s)
        return out

def ranked_files(passages, scores):
    """Files in order of their best passage."""
    seen, files = set(), []
    for i in sorted(range(len(scores)), key=lambda i: -scores[i]):
        name = passages[i][0]
        if name not in seen:
            seen.add(name)
            files.append(name)
    return files

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--docs", required=True, help="folder of .txt files")
    parser.add_argument("--queries", required=True, help="JSON lines: {\\"query\\": ..., \\"relevant\\": [file, ...]}")
    parser.add_argument("--k", type=int, default=5)
    args = parser.parse_args()
    passages = load_passages(args.docs)
    index = BM25([text for _, text in passages])
    queries = [json.loads(line) for line in Path(args.queries).read_text().splitlines() if line.strip()]
    hits, reciprocal = 0, 0.0
    for q in queries:
        files = ranked_files(passages, index.scores(q["query"]))
        ranks = [files.index(f) + 1 for f in q["relevant"] if f in files]
        first = min(ranks) if ranks else None
        hits += first is not None and first <= args.k
        reciprocal += 1 / first if first else 0.0
        print(f"{q['query'][:40]:<40} first relevant at rank {first}")
    print(f"{len(passages)} passages, {len(queries)} queries: "
          f"recall@{args.k} {hits / len(queries):.2f}, MRR {reciprocal / len(queries):.2f}")

if __name__ == "__main__":
    main()`,
  annotations: [
    {
      id: 'tokenize',
      range: { line: 8 },
      kind: 'variable',
      title: 'A deliberately simple tokenizer',
      what: 'Lowercase letters, digits and underscores; everything else separates tokens.',
      why: 'Keeps identifiers like sort_keys intact. Your error analysis will show where it is too simple (plurals, hyphens).',
    },
    {
      id: 'passages',
      range: { line: 13 },
      kind: 'function',
      title: 'Passages, not whole files',
      what: 'Groups paragraphs until a passage has at least 40 words.',
      why: 'A long page mentions many topics. Scoring passages and ranking a file by its best passage keeps one strong match from being diluted.',
    },
    {
      id: 'idf',
      range: { line: 35 },
      kind: 'math',
      title: 'Inverse document frequency',
      what: 'log(1 + (N − df + 0.5) / (df + 0.5)): rare terms weigh more than common ones.',
      why: 'A match on "hexdigest" says far more than a match on "the".',
    },
    {
      id: 'bm25',
      range: { line: 45 },
      kind: 'math',
      title: 'BM25 term weight',
      what: 'Term frequency with diminishing returns (k1) and a length penalty (b) relative to the average passage.',
      why: 'Ten mentions are not ten times better than one, and long passages should not win just by being long.',
    },
    {
      id: 'mrr',
      range: { line: 75 },
      kind: 'math',
      title: 'Reciprocal rank',
      what: '1 for a relevant file at rank 1, 1/2 at rank 2, and 0 when no relevant file is found.',
      why: 'Averaged over queries it is the mean reciprocal rank (MRR): it rewards putting the right answer first.',
    },
  ],
};

export const demoQueries: CodeExample = {
  id: 'capstone-nlp-queries',
  language: 'json',
  source: `{"query": "pretty print a dictionary as JSON with sorted keys", "relevant": ["library/json.txt"]}
{"query": "read rows of a spreadsheet export", "relevant": ["library/csv.txt"]}
{"query": "fingerprint a file by its content", "relevant": ["library/hashlib.txt"]}
{"query": "turn text back into a Python object", "relevant": ["library/json.txt"]}
{"query": "check that a download was not corrupted", "relevant": ["library/hashlib.txt"]}`,
  annotations: [],
};

export const demoOutput: CodeExample = {
  id: 'capstone-nlp-output',
  language: 'bash',
  source: `python search.py --docs docs --queries queries.jsonl --k 1
# pretty print a dictionary as JSON with s first relevant at rank 1
# read rows of a spreadsheet export        first relevant at rank 1
# fingerprint a file by its content        first relevant at rank 1
# turn text back into a Python object      first relevant at rank 1
# check that a download was not corrupted  first relevant at rank 3
# 5 passages, 5 queries: recall@1 0.80, MRR 0.87`,
  annotations: [],
};

export const brief: ProjectBrief = {
  goal: 'Build a search system that answers questions about the Python standard library by returning the right documentation page, measure it on a labeled set of queries, compare keyword search (BM25) with embedding search and a combination, and analyze which kinds of questions each one fails on.',
  dataset:
    'The plain-text Python documentation (a free download from docs.python.org), restricted to the library/ folder, plus a query set you write yourself: at least 60 questions, each labeled with the file or files that answer it. Write a third of them without using the words of the page (paraphrases).',
  milestones: [
    'Download the documentation, run search.py on it with five of your own queries',
    'Write and label at least 60 queries in queries.jsonl, tagged keyword, paraphrase or multi-page, and freeze a test third that you do not look at while tuning',
    'Report recall@5 and MRR for BM25 on the development queries, per tag',
    'Add embedding search with sentence-transformers (all-MiniLM-L6-v2) over the same passages and report the same metrics',
    'Combine both rankings (for example reciprocal rank fusion) and tune one setting on the development queries only',
    'Error analysis: for 20 failed queries, record why each failed (vocabulary mismatch, wrong passage split, ambiguous query, label error)',
    'Evaluate all three systems once on the frozen test queries and write the report with a recommendation',
  ],
  rubric: [
    {
      criterion: 'Evaluation set',
      detail:
        'Queries are realistic, labeled consistently, tagged by type, and split into development and frozen test parts before any tuning.',
    },
    {
      criterion: 'Metrics',
      detail:
        'Recall@k and MRR are defined in the report, computed per query type, with the number of queries next to every figure.',
    },
    {
      criterion: 'Comparison',
      detail:
        'BM25, embeddings and the combination use the same passages and queries; differences are discussed against how few queries there are.',
    },
    {
      criterion: 'Error analysis',
      detail:
        'Failures are read and categorized with counts and examples; each category suggests a concrete change.',
    },
    {
      criterion: 'Engineering',
      detail: 'The index is built once and saved; the search runs from one command; versions are pinned.',
    },
    {
      criterion: 'Report',
      detail:
        'Recommends a system for this use and says what would change the recommendation (more data, latency limits, other languages).',
    },
  ],
  hints: [
    'Compute passage embeddings once and save them with numpy.save; encoding the queries is then fast.',
    'Normalize embeddings and use the dot product as cosine similarity.',
    'Reciprocal rank fusion scores a file by the sum of 1 / (60 + rank) over the rankings it appears in.',
    'With 20 test queries, one query moves recall by 0.05. Say so when two systems differ by that much.',
    'Paraphrase queries are where embeddings usually help; exact names like functools.lru_cache are where BM25 usually wins. Check whether your data agrees.',
  ],
};

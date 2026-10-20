import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'why-retrieve',
    type: 'choice',
    prompt:
      'Why does a RAG system put retrieved passages into the prompt instead of relying on what the model already knows?',
    options: [
      {
        text: 'The model has never seen your private, recent documents, and passages in the prompt can be cited and checked',
        correct: true,
        explain:
          'A model only knows its training data. Retrieval gives it your current documents at question time, and numbered sources make answers verifiable.',
      },
      {
        text: 'Retrieval retrains the model on the documents',
        correct: false,
        explain:
          'Nothing is trained. The model’s weights are unchanged; it only reads the passages in its prompt.',
      },
      {
        text: 'A longer prompt always gives a better answer',
        correct: false,
        explain:
          'Irrelevant passages cost tokens and can distract the model. The goal is the right few passages, not many.',
      },
    ],
  },
  {
    id: 'overlap',
    type: 'choice',
    prompt:
      'With 8-word chunks and no overlap, "Monthly plans are not refunded." is split across two chunks. What does an overlap of 2 words fix?',
    options: [
      {
        text: 'A sentence cut at a chunk boundary also appears whole, or nearly whole, at the start of the next chunk',
        correct: true,
        explain:
          'Consecutive chunks share the overlap words, so a fact near a boundary has a second chance to land in one chunk.',
      },
      {
        text: 'It removes duplicate text from the index',
        correct: false,
        explain:
          'Overlap does the opposite: it stores some words twice, which costs a little storage and embedding time.',
      },
      {
        text: 'It makes every chunk shorter',
        correct: false,
        explain: 'Chunks keep their size; they just start closer together (every size − overlap words).',
      },
    ],
  },
  {
    id: 'chunk-count',
    type: 'numeric',
    prompt:
      'A document has 100 words. With chunks of 40 words and an overlap of 10, how many chunks does chunk_words make?',
    answer: 3,
    tolerance: 0,
    hint: 'Chunks start every 40 − 10 = 30 words: at word 0, 30, 60 … Stop once a chunk reaches the end.',
    explain:
      'Starts at 0 (words 0–39), 30 (30–69) and 60 (60–99). The third chunk reaches word 99, the last one, so there are 3 chunks.',
  },
  {
    id: 'rerank',
    type: 'choice',
    prompt:
      'For "What does error E-402 mean?", cosine similarity ranks a chunk about payment error B-402 first. Why does adding a keyword score fix it?',
    options: [
      {
        text: '"e-402" is a rare exact term that only the right chunk contains, and BM25 rewards rare exact matches',
        correct: true,
        explain:
          'The embedding sees two similar error-code passages; BM25 sees that only one contains the term e-402, which appears in just one chunk.',
      },
      {
        text: 'Keyword scores understand meaning better than embeddings',
        correct: false,
        explain:
          'They don’t: keywords miss paraphrases such as "money back" for "refund". That is why the two scores are combined.',
      },
      {
        text: 'Reranking looks at more chunks than retrieval',
        correct: false,
        explain:
          'It looks at fewer: only the first stage’s candidates, which is what makes a more expensive reranker affordable.',
      },
    ],
  },
  {
    id: 'order',
    type: 'order',
    prompt: 'Put the steps of answering one question in order (indexing has already happened).',
    items: [
      'Embed the question',
      'Retrieve the candidate chunks with the highest cosine similarity',
      'Rerank the candidates and keep the top k',
      'Assemble the prompt with numbered sources',
      'Generate the answer and check its citations',
    ],
    explain:
      'Retrieval is cheap and broad, reranking is careful and narrow, and only then does the model see the text.',
  },
];

export const promptExercise: Exercise = {
  id: 'build-prompt',
  prompt:
    'Write `build_prompt(question, chunks)` where `chunks` is a list of `(title, text)` pairs. Number the chunks from 1 in a context block, as in the lesson, and end with the question.',
  starter: `SYSTEM = "Answer using only the context below. Cite sources as [1], [2] and so on. If the context does not contain the answer, say so."

def build_prompt(question, chunks):
    # One line per chunk: [n] (title) text, separated by blank lines.
    pass`,
  hints: [
    '`enumerate(chunks, 1)` counts from 1 and gives you each `(title, text)` pair.',
    'Join the chunk lines with `"\\n\\n"` so each source is its own paragraph.',
    'Return `f"{SYSTEM}\\n\\nContext:\\n{context}\\n\\nQuestion: {question}\\nAnswer:"`.',
  ],
  solution: `SYSTEM = "Answer using only the context below. Cite sources as [1], [2] and so on. If the context does not contain the answer, say so."

def build_prompt(question, chunks):
    context = "\\n\\n".join(f"[{n}] ({title}) {text}" for n, (title, text) in enumerate(chunks, 1))
    return f"{SYSTEM}\\n\\nContext:\\n{context}\\n\\nQuestion: {question}\\nAnswer:"`,
  explanation:
    'The instructions come first, then each source with a number the model can cite, then the question last, closest to where the model starts writing. Keeping the format fixed lets your code check that every [n] in the answer refers to a real source.',
  tests: `p = build_prompt("How long is the link valid?", [("Account security", "The link is valid for 30 minutes."), ("Email", "Verification links last 24 hours.")])
assert p.startswith(SYSTEM), 'the prompt should start with the instructions'
assert "[1] (Account security) The link is valid for 30 minutes." in p, 'the first chunk should be numbered [1] with its title'
assert "[2] (Email) Verification links last 24 hours." in p, 'the second chunk should be numbered [2]'
assert p.endswith("Question: How long is the link valid?\\nAnswer:"), 'the prompt should end with the question and "Answer:"'
assert "minutes.\\n\\n[2]" in p, 'sources should be separated by a blank line'`,
};

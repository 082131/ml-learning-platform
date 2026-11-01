// Code for ai/capstone/ai-app. The setup commands and the evaluation harness are starting points for your own
// repository; they need your API key and your documents, so they are not run on this page and show no output.
import type { CodeExample, ProjectBrief } from '@/lib/types';

export const setupCode: CodeExample = {
  id: 'capstone-ai-setup',
  language: 'bash',
  source: `python3 -m venv .venv
source .venv/bin/activate              # Windows: .venv\\Scripts\\activate
pip install anthropic pytest           # plus your embedding model and vector store
pip freeze > requirements.txt          # commit this file, so the versions are pinned
export ANTHROPIC_API_KEY=...           # from your key manager; never commit it
python eval.py --version v1            # writes results/v1.jsonl and prints the totals`,
  annotations: [
    {
      id: 'freeze',
      range: { line: 4 },
      kind: 'syntax',
      title: 'Pin what you used',
      what: 'Records the exact package versions you installed.',
      why: 'A reviewer must be able to reproduce your evaluation numbers with the same libraries.',
    },
    {
      id: 'key',
      range: { line: 5 },
      kind: 'variable',
      title: 'ANTHROPIC_API_KEY',
      what: 'The SDK reads the key from this environment variable.',
      why: 'Keys in code end up in git history. Keep them in the environment or a secrets manager.',
    },
  ],
};

export const harnessCode: CodeExample = {
  id: 'capstone-ai-harness',
  language: 'python',
  source: `import json, sys, time
import anthropic

client = anthropic.Anthropic()          # retries rate limits and server errors twice by default
MODEL = "claude-opus-5-5"               # pin the exact model id, and record it with the results

def run_case(case, version):
    sources = retrieve(case["question"], k=4)              # your retriever, from the RAG lessons
    started = time.monotonic()
    response = client.messages.create(
        model=MODEL,
        max_tokens=500,
        system=load_prompt(version),
        messages=[{"role": "user", "content": build_prompt(case["question"], sources)}],
    )
    answer = response.content[0].text
    return {
        "id": case["id"],
        "version": version,
        "model": response.model,
        "answer": answer,
        "category": grade(case, answer, sources),          # your code graders, from the evals lesson
        "retrieved": [s.id for s in sources],
        "input_tokens": response.usage.input_tokens,
        "output_tokens": response.usage.output_tokens,
        "seconds": round(time.monotonic() - started, 2),
    }

version = sys.argv[sys.argv.index("--version") + 1]
cases = [json.loads(line) for line in open("eval/cases.jsonl")]
results = [run_case(c, version) for c in cases]
with open(f"results/{version}.jsonl", "w") as f:
    f.writelines(json.dumps(r) + "\\n" for r in results)
passed = sum(r["category"] in ("correct", "correct refusal") for r in results)
print(f"{version}: {passed}/{len(results)} passed")`,
  annotations: [
    {
      id: 'model',
      range: { line: 5 },
      kind: 'variable',
      title: 'MODEL',
      what: 'The exact model id used for every case.',
      why: 'Results are only comparable for the same model; a model change is a new version to evaluate.',
    },
    {
      id: 'retrieve',
      range: { line: 8 },
      kind: 'function',
      title: 'retrieve()',
      what: 'Your retrieval step: embed the question, search the index, rerank.',
      why: 'Logging which chunks were retrieved lets you tell retrieval failures from generation failures.',
    },
    {
      id: 'grade',
      range: { line: 22 },
      kind: 'function',
      title: 'grade()',
      what: 'Returns a failure category such as "unsupported claim" or "correct refusal".',
      why: 'Categories point at fixes; a single pass rate doesn’t.',
    },
    {
      id: 'usage',
      range: { line: 24 },
      kind: 'variable',
      title: 'Tokens and time per case',
      what: 'Cost and latency recorded next to quality, for every case.',
      why: 'A version that is 2 points better and twice as expensive is a decision, not an obvious win.',
    },
    {
      id: 'save',
      range: { line: 33 },
      kind: 'syntax',
      title: 'Save every result',
      what: 'One JSON line per case and version.',
      why: 'Comparing versions per case (which cases flipped?) needs the saved results, not just the totals.',
    },
  ],
};

export const brief: ProjectBrief = {
  goal: 'Build an assistant that answers questions from a document collection, with citations, and ship it as a small but complete system: retrieval, a prompt with structured output, an evaluation set with code graders, guardrails, cost limits, versioned releases and monitoring, documented in a short model card.',
  dataset:
    'Your own documents, or a public set you are allowed to use, such as the documentation of an open-source project you know. Aim for at least 30 pages, so that retrieval has to choose. The evaluation set is yours to write: at least 40 questions from the way real users ask, including at least 8 that the documents do not answer, each with the expected phrase or "no answer".',
  milestones: [
    'Choose the documents and the users, and write down what a good answer is and what a harmful one is',
    'Write the evaluation set first: questions, expected phrases or "no answer", and the sources that contain each answer',
    'Build retrieval (chunking, embeddings, an index, optionally reranking) and measure recall@k and MRR on the evaluation questions',
    'Write the prompt with citations and a JSON reply format, validate every reply, and grade answers with code: correct, unsupported claim, bad citation, answered without a source, missed answer',
    'Improve one thing at a time (chunking, k, prompt, model), saving every run and comparing per case',
    'Add an input guardrail and measure what it catches and what it wrongly blocks; plant one indirect prompt injection in a document and show it can’t cause harm',
    'Add a response cache or prompt caching, estimate the monthly cost at your expected traffic, and set a spending limit and per-user rate limit',
    'Serve it behind an API with streaming, log version, tokens, latency and check results per request, and release a second prompt version behind a flag',
    'Write a model card: intended use, the model id, evaluation results by category, cost and latency, known failures, and how to reproduce',
  ],
  rubric: [
    {
      criterion: 'Problem framing',
      detail:
        'Names the users, the documents and what a harmful answer is; the evaluation and the guardrails follow from that.',
    },
    {
      criterion: 'Approach choice',
      detail:
        'Explains why the project calls a pretrained model through an API with retrieval, rather than training or fine-tuning, and what would change that.',
    },
    {
      criterion: 'Retrieval',
      detail:
        'Reports recall@k and MRR, and shows at least one change to chunking, k or reranking and its measured effect.',
    },
    {
      criterion: 'Evaluation',
      detail:
        'Has unanswerable questions, code graders with failure categories, saved per-case results, and any model grader checked against hand grades.',
    },
    {
      criterion: 'Safety and privacy',
      detail:
        'Guardrail recall and wrong blocks are measured; tools, if any, follow least privilege; logs leave out personal data or are restricted.',
    },
    {
      criterion: 'Cost and latency',
      detail:
        'Tokens, cost per request and p50/p95 latency are measured, with a monthly estimate and a spending limit.',
    },
    {
      criterion: 'Operations',
      detail:
        'Prompt and model versions are pinned and logged; a second version is released behind a flag and can be rolled back in one step.',
    },
    {
      criterion: 'Communication',
      detail:
        'The model card states the model id, results by category with the number of cases, known failure cases, and limits, without overstating.',
    },
  ],
  hints: [
    'Write the evaluation questions before building anything; questions written after you see the system’s answers tend to be the ones it gets right.',
    'When an answer is wrong, first check whether the right chunk was retrieved. That splits every failure into a retrieval problem or a generation problem.',
    'With 40 cases, one case is 2.5 points. Report counts (“31 of 40”), and don’t celebrate a one-case difference.',
    'Start with the strongest model to find out what is possible, then try a smaller one and compare per case and per dollar.',
    'Put the stable part of the prompt first and the retrieved chunks and question last, so prompt caching can work.',
  ],
};

// Code for the evals and guardrails lesson. The graders, categories, guardrail rules and counts live in
// src/lib/ai/evals.ts and src/lib/ai/guardrails.ts (unit-tested). The answers of both prompt versions are scripted.
// The judge sample is a template, not run here. The pure-Python runner was run with CPython 3.13 and its output
// copied here.
import { evalExperiment } from '@/lib/ai/evals';
import { guardExperiment } from '@/lib/ai/guardrails';
import type { CodeExample } from '@/lib/types';

export const evals = evalExperiment('evals', { version: 'v1' });
export const guard = guardExperiment('guardrail', { strictness: 'standard' });

export const graderRunner: CodeExample = {
  id: 'grader',
  language: 'python',
  run: 'pyodide',
  source: `import re

SOURCES = [
    "Each token can make up to 60 requests per minute. Requests above that limit receive HTTP status 429.",
    "Error E-402 means your storage quota is full.",
]
CLAIM = re.compile(r"\\b[A-Z]-\\d{3}\\b|\\d+(?:\\.\\d+)?%?")


def grade(answer, expected):
    cited = [int(n) for n in re.findall(r"\\[(\\d+)\\]", answer)]
    bad_citations = [n for n in cited if not 1 <= n <= len(SOURCES)]
    text = re.sub(r"\\[\\d+\\]", "", answer)
    cited_text = " ".join(SOURCES[n - 1] for n in cited if n not in bad_citations)
    unsupported = [c for c in CLAIM.findall(text) if c not in cited_text]
    return {
        "fact": expected.lower() in answer.lower(),
        "citations_ok": bool(cited) and not bad_citations,
        "unsupported": unsupported,
    }


print(grade("Each token can make up to 60 requests per minute [1].", "60 requests per minute"))
print(grade("Each token can make up to 100 requests per minute [1].", "60 requests per minute"))
print(grade("Error E-402 means your storage quota is full [3].", "storage quota is full"))`,
  annotations: [
    {
      id: 'claim',
      range: { line: 7 },
      kind: 'math',
      title: 'CLAIM',
      what: 'Matches error codes such as E-402, and numbers with an optional decimal part and percent sign.',
      why: 'Numbers and codes are the claims that are both easiest to check in code and most damaging when invented.',
    },
    {
      id: 'citations',
      range: { line: 11 },
      kind: 'variable',
      title: 'cited',
      what: 'Every [n] in the answer, as numbers.',
      why: 'A citation to a source that was never sent is a sure sign of a made-up reference.',
    },
    {
      id: 'unsupported',
      range: { line: 15 },
      kind: 'variable',
      title: 'unsupported',
      what: 'Claims that appear in none of the cited sources.',
      why: 'This is a narrow, cheap hallucination check. Claims in words (“refunds are instant”) need a rubric or a judge.',
    },
  ],
  expectedOutput: `{'fact': True, 'citations_ok': True, 'unsupported': []}
{'fact': False, 'citations_ok': True, 'unsupported': ['100']}
{'fact': True, 'citations_ok': False, 'unsupported': ['E-402']}`,
};

export const judgeCode: CodeExample = {
  id: 'llm-judge',
  language: 'python',
  source: `JUDGE_PROMPT = """You grade answers from a support assistant.

Question: {question}
Sources: {sources}
Answer: {answer}

Score each criterion 0 or 1:
- grounded: every claim in the answer is stated in the sources
- complete: the answer addresses the whole question
- tone: polite and plain, no jargon

Reply with only JSON: {{"grounded": 0 or 1, "complete": 0 or 1, "tone": 0 or 1, "reason": "..."}}"""

def judge(case, answer):
    reply = ask_model(JUDGE_PROMPT.format(question=case.question, sources=case.sources, answer=answer))
    return parse_scores(reply)  # validate like any structured output`,
  annotations: [
    {
      id: 'rubric',
      range: { line: 7 },
      kind: 'syntax',
      title: 'A rubric of yes/no criteria',
      what: 'Separate criteria scored 0 or 1, each defined in one line.',
      why: 'Binary criteria are graded more consistently than a 1 to 10 score, by models and by people.',
    },
    {
      id: 'json',
      range: { line: 12 },
      kind: 'syntax',
      title: 'JSON reply with a reason',
      what: 'The judge returns scores and a short reason.',
      why: 'The reason lets you audit disagreements. The doubled braces are literal braces in a Python format string.',
    },
    {
      id: 'validate',
      range: { line: 16 },
      kind: 'function',
      title: 'parse_scores(reply)',
      what: 'Parses and validates the judge’s JSON like any structured output.',
      why: 'A judge is a model too: its output can be malformed, and its grades must be checked against people on a sample.',
    },
  ],
};

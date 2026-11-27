// Code for "Instruction data". The explorers use src/lib/finetune/template.ts (unit-tested): ChatML rendering, loss
// masks with label -100, and best-fit-decreasing packing like TRL's default packing_strategy="bfd". Tokens are
// word-level for illustration. mask.py runs under CPython 3.13 and Pyodide (checked by python-outputs.test.ts).
// The TRL snippet was checked against TRL 1.19's SFTConfig fields; it is not run here.
import { maskExperiment, packExperiment } from '@/lib/finetune/experiments';
import type { CodeExample } from '@/lib/types';

export const mask = maskExperiment('ft-mask');
export const packing = packExperiment('ft-pack');

export const dataset: CodeExample = {
  id: 'ft-dataset-jsonl',
  language: 'json',
  source: `{"messages": [{"role": "system", "content": "You are the support assistant for Acme Cloud."}, {"role": "user", "content": "How do I reset my password?"}, {"role": "assistant", "content": "Open Settings, choose Security, then click Reset password."}]}
{"messages": [{"role": "user", "content": "Can I get a refund?"}, {"role": "assistant", "content": "Refunds are available within 30 days from the Billing page."}]}
{"prompt": [{"role": "user", "content": "Classify: 'App crashes on login'"}], "completion": [{"role": "assistant", "content": "bug"}]}`,
  annotations: [
    {
      id: 'conv',
      range: { line: 1 },
      kind: 'syntax',
      title: 'Conversational format',
      what: 'One JSON object per line (JSONL), with a list of messages, each with a role and content. This is the format TRL’s SFTTrainer and most hosted fine-tuning services accept.',
      why: 'Storing messages, not pre-rendered text, lets the trainer apply the model’s own chat template, so the format always matches the model.',
    },
    {
      id: 'nosys',
      range: { line: 2 },
      kind: 'syntax',
      title: 'System prompts are optional',
      what: 'Examples may omit the system message.',
      why: 'If production always sends a system prompt, include the same one in training, or the model learns a format it never sees at inference.',
    },
    {
      id: 'pc',
      range: { line: 3 },
      kind: 'syntax',
      title: 'Prompt-completion format',
      what: 'Separate prompt and completion fields. TRL trains only on the completion for this format by default (completion_only_loss).',
      why: 'Useful when each example has exactly one answer, such as classification or extraction.',
    },
  ],
};

export const maskCode: CodeExample = {
  id: 'ft-mask-code',
  language: 'python',
  run: 'pyodide',
  source: `import re

def tokenize(text):                      # word-level tokens, for illustration only
    return re.findall(r"\\n|[A-Za-z0-9']+|[^\\sA-Za-z0-9']", text)

def render(messages):
    """ChatML: <|im_start|>role\\\\ncontent<|im_end|>\\\\n, and a flag for 'is this token trained?'"""
    tokens, trained = [], []
    for m in messages:
        header = ["<|im_start|>", m["role"], "\\n"]
        body = tokenize(m["content"]) + ["<|im_end|>"]
        is_reply = m["role"] == "assistant"
        tokens += header + body + ["\\n"]
        trained += [False] * len(header) + [is_reply] * len(body) + [False]
    return tokens, trained

messages = [
    {"role": "system", "content": "You are the support assistant for Acme Cloud."},
    {"role": "user", "content": "How do I reset my password?"},
    {"role": "assistant", "content": "Open Settings, choose Security, then click Reset password."},
]
tokens, trained = render(messages)
labels = [i if t else -100 for i, t in enumerate(trained)]   # token ids are positions here
print(len(tokens), "tokens,", sum(trained), "in the loss")
print("trained:", " ".join(t for t, k in zip(tokens, trained) if k))
print("labels: ", labels[-14:])`,
  expectedOutput: `42 tokens, 12 in the loss
trained: Open Settings , choose Security , then click Reset password . <|im_end|>
labels:  [-100, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, -100]`,
  annotations: [
    {
      id: 'header',
      range: { line: 10 },
      kind: 'variable',
      title: 'The role header',
      what: '<|im_start|>, the role name and a newline. The model reads these to know whose turn it is.',
      why: 'The header "<|im_start|>assistant\\n" is never trained: at inference it is part of the prompt (the generation prompt), not something the model writes.',
    },
    {
      id: 'end',
      range: { line: 11 },
      kind: 'variable',
      title: 'Train the end token',
      what: 'The reply body plus <|im_end|>, the token that closes the turn.',
      why: 'If <|im_end|> were masked, the model would never learn to stop, and at inference it would ramble on into a made-up next user turn.',
    },
    {
      id: 'labels',
      range: { line: 23 },
      kind: 'math',
      title: 'Label −100',
      what: 'PyTorch’s cross-entropy ignores positions whose label is −100 (its ignore_index). Every other position is scored on its token as usual.',
      why: 'Masked tokens still shape the model’s understanding through attention; they just are not targets. The model learns to answer the user, not to imitate the user.',
    },
  ],
};

export const trlConfig: CodeExample = {
  id: 'ft-trl-sft-data',
  language: 'python',
  source: `# Not run here: TRL 1.19.
from datasets import load_dataset
from trl import SFTConfig

dataset = load_dataset("json", data_files={"train": "train.jsonl", "eval": "eval.jsonl"})

config = SFTConfig(
    output_dir="runs/support-sft",
    max_length=2048,            # longer examples are truncated: check how many first
    assistant_only_loss=True,   # loss on assistant turns only (needs a template with generation markers)
    packing=True,               # best-fit-decreasing packing into rows of max_length
    padding_free=True,          # with FlashAttention: no padding, and packed examples do not attend to each other
)`,
  annotations: [
    {
      id: 'maxlen',
      range: { line: 8 },
      kind: 'parameter',
      title: 'max_length',
      what: 'The longest sequence (and, with packing, the row length). TRL’s default is 1,024.',
      why: 'An answer cut off in the middle teaches the model to stop mid-sentence. Measure your token lengths before choosing this.',
    },
    {
      id: 'aol',
      range: { line: 9 },
      kind: 'parameter',
      title: 'assistant_only_loss',
      what: 'Masks everything except the assistant turns. It relies on the chat template marking assistant text with {% generation %} blocks; templates without them cannot be used this way.',
      why: 'For multi-turn data this is the usual choice. For prompt-completion data, completion_only_loss does the same job and is on by default.',
    },
    {
      id: 'pack',
      range: { line: 10 },
      kind: 'parameter',
      title: 'packing',
      what: 'Fills each row of max_length tokens with several examples (strategy "bfd": best-fit decreasing, keeping examples whole).',
      why: 'Short chat examples padded to 2,048 tokens waste most of the compute. Packing can make a run several times faster.',
    },
    {
      id: 'pf',
      range: { line: 11 },
      kind: 'parameter',
      title: 'padding_free',
      what: 'Flattens the batch and passes each example’s boundaries to FlashAttention.',
      why: 'Without boundaries, a packed example could attend to the unrelated example before it in the same row.',
    },
  ],
};

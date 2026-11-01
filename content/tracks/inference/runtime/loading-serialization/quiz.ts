import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'unsafe',
    type: 'choice',
    prompt: 'Why can loading a .pt file from an untrusted source compromise a server, while loading a .safetensors file cannot?',
    options: [
      {
        text: '.pt files are pickles, and unpickling calls whatever functions the file names; safetensors files are a JSON header plus raw bytes',
        correct: true,
        explain: 'A safetensors loader only parses JSON and copies bytes. A pickle loader runs code by design (unless restricted with weights_only=True).',
      },
      {
        text: 'safetensors files are encrypted',
        correct: false,
        explain: 'They are not encrypted at all: the header is plain JSON. They are safe because they contain no code.',
      },
      {
        text: '.pt files are larger, so they can overflow memory',
        correct: false,
        explain: 'Size is not the issue. A tiny pickle can run any command on load.',
      },
    ],
  },
  {
    id: 'prefix',
    type: 'choice',
    prompt: 'load_state_dict reports every key as both missing and unexpected, for example "fc1.weight" missing and "module.fc1.weight" unexpected. What happened?',
    options: [
      {
        text: 'The checkpoint was saved from a wrapper such as nn.DataParallel, which prefixes every name with "module."',
        correct: true,
        explain: 'Strip the prefix from the keys (or save model.module.state_dict()) and it loads.',
      },
      {
        text: 'The file is corrupted',
        correct: false,
        explain: 'A corrupted file fails to parse at all. Here every tensor is present with a consistent, prefixed name.',
      },
      {
        text: 'The dtypes differ',
        correct: false,
        explain: 'Dtype differences are converted on copy. They never show up as missing or unexpected keys.',
      },
    ],
  },
  {
    id: 'size',
    type: 'numeric',
    prompt: 'How many bytes of tensor data does a safetensors file hold for a 7,000,000,000-parameter model stored in BF16? (in GB, 10⁹ bytes)',
    answer: 14,
    tolerance: 0.001,
    hint: 'BF16 is 2 bytes per value; the header is negligible.',
    explain: '7 × 10⁹ × 2 bytes = 14 × 10⁹ bytes = 14 GB (13.04 GiB).',
  },
  {
    id: 'strict-false',
    type: 'choice',
    prompt: 'A teammate “fixes” a loading error by passing strict=False. What is the risk?',
    options: [
      {
        text: 'Parameters whose names did not match keep their random initial values, so the model serves wrong answers without any error',
        correct: true,
        explain: 'strict=False returns the missing and unexpected keys instead of raising. If you use it, check that both lists are what you expect.',
      },
      {
        text: 'None: PyTorch matches tensors by shape when names differ',
        correct: false,
        explain: 'It never matches by shape. Unmatched names are simply skipped.',
      },
      {
        text: 'It makes loading slower',
        correct: false,
        explain: 'Speed is unchanged; correctness is what is lost.',
      },
    ],
  },
];

export const prefixExercise: Exercise = {
  id: 'fix-state-dict',
  prompt:
    'Write `fix_keys(state, expected)`: remove a leading "module." from every key, then return (fixed, missing, unexpected), where missing and unexpected are sorted lists of names.',
  starter: `def fix_keys(state, expected):
    pass`,
  hints: [
    'str.removeprefix("module.") returns the string without the prefix, or unchanged if it is not there.',
    'Build the new dictionary with a comprehension over state.items().',
    'missing: names in expected but not in fixed. unexpected: names in fixed but not in expected. Wrap both in sorted().',
  ],
  solution: `def fix_keys(state, expected):
    fixed = {k.removeprefix("module."): v for k, v in state.items()}
    missing = sorted(k for k in expected if k not in fixed)
    unexpected = sorted(k for k in fixed if k not in expected)
    return fixed, missing, unexpected`,
  explanation:
    'Loading matches by name, so renaming is the whole fix for a wrapper prefix. Returning missing and unexpected lets the caller refuse to serve unless both are empty, which is what strict loading does.',
  tests: `state = {"module.fc1.weight": 1, "module.fc1.bias": 2, "module.fc2.weight": 3}
expected = ["fc1.weight", "fc1.bias", "fc2.weight", "fc2.bias"]
fixed, missing, unexpected = fix_keys(state, expected)
assert set(fixed) == {"fc1.weight", "fc1.bias", "fc2.weight"}, 'the prefix is removed from every key'
assert fixed["fc1.bias"] == 2, 'values are kept'
assert missing == ["fc2.bias"], 'fc2.bias is reported missing'
assert unexpected == [], 'nothing is unexpected after the fix'
assert fix_keys({"head.weight": 0}, ["fc.weight"])[2] == ["head.weight"], 'unknown names are reported as unexpected'
assert fix_keys({"fc.module.x": 0}, [])[0] == {"fc.module.x": 0}, 'only a leading prefix is removed'`,
};

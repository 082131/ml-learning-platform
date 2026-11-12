import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'read-traceback',
    type: 'choice',
    prompt: 'Where in a Python traceback do you find the error type and the line that actually failed?',
    options: [
      { text: 'At the top: the first File line', correct: false, explain: 'The top is the outermost call, usually your script’s entry point. It rarely shows the real problem.' },
      { text: 'At the bottom: the last File line and the error', correct: true, explain: 'Tracebacks list calls from outermost to innermost, so the failing line and the message come last.' },
      { text: 'In the middle, where your own code is', correct: false, explain: 'Your code can be anywhere in the chain; read up from the bottom until you reach a file you wrote.' },
    ],
  },
  {
    id: 'bare-except',
    type: 'choice',
    prompt: 'Why is `except Exception: return None` around a whole data-loading function a bad idea?',
    options: [
      { text: 'It is slower than a specific except', correct: false, explain: 'Speed is not the issue; catching an exception costs about the same either way.' },
      { text: 'It also hides bugs such as typos and wrong types', correct: true, explain: 'A NameError from a typo or a TypeError from bad input turns into a silent None, and the bug surfaces far away, or never.' },
      { text: 'Exception does not catch ValueError', correct: false, explain: 'ValueError is a subclass of Exception, so it is caught; that is part of the problem.' },
      { text: 'Python forbids returning from except', correct: false, explain: 'Returning from an except block is allowed.' },
    ],
  },
  {
    id: 'finally',
    type: 'choice',
    prompt: 'In `try: ... except ValueError: ... else: ... finally: ...`, when does the `else` block run?',
    options: [
      { text: 'Only when the try block raised nothing', correct: true, explain: 'else is for code that should run only after success, kept outside try so its own errors are not caught by mistake.' },
      { text: 'Only when except did not match', correct: false, explain: 'An unmatched exception propagates; else never runs then.' },
      { text: 'Always, like finally', correct: false, explain: 'That is finally’s job: it runs on success, on a caught error and on an uncaught one.' },
    ],
  },
  {
    id: 'with',
    type: 'choice',
    prompt: 'What does `with open(path) as f:` guarantee that `f = open(path)` does not?',
    options: [
      { text: 'That the file exists', correct: false, explain: 'Both raise FileNotFoundError if it does not.' },
      { text: 'That the file is read faster', correct: false, explain: 'The with block changes nothing about reading speed.' },
      { text: 'That the file is closed, even after an error', correct: true, explain: 'A context manager runs its cleanup when the block ends, normally or through an exception.' },
      { text: 'That the file is opened read-only', correct: false, explain: 'The mode argument decides that; "r" is the default for both forms.' },
    ],
  },
  {
    id: 'csv-strings',
    type: 'choice',
    prompt: '`csv.DictReader` reads a row with `loss` written as 0.61. What is `row["loss"] * 2`?',
    options: [
      { text: '1.22', correct: false, explain: 'Only after float(row["loss"]). The csv module does not convert types.' },
      { text: "'0.610.61'", correct: true, explain: 'Every value csv reads is a string, and multiplying a string by 2 repeats it.' },
      { text: 'TypeError', correct: false, explain: 'str * int is allowed in Python (repetition); str * str would raise TypeError.' },
    ],
  },
  {
    id: 'venv',
    type: 'choice',
    prompt: 'A teammate’s training script fails with a pandas error you cannot reproduce. Which step makes your environments match?',
    options: [
      { text: 'Both run pip install pandas', correct: false, explain: 'That installs whatever version is newest today, which may differ between you.' },
      { text: 'Install from the same pinned requirements.txt in a fresh venv', correct: true, explain: 'Pinned versions (pandas==3.0.2) in a clean environment give both of you the same libraries.' },
      { text: 'Upgrade Python to the latest version', correct: false, explain: 'A newer Python does not pin library versions, and may add differences.' },
    ],
  },
];

export const loadExercise: Exercise = {
  id: 'py-errors-parse-ages',
  prompt: 'Write parse_ages(values) that converts strings to ints and reports what it could not parse.',
  starter: `def parse_ages(values):
    ages = []
    bad = []
    for v in values:
        ages.append(int(v))
    return ages, bad`,
  hints: [
    'Wrap only int(v) in try / except ValueError.',
    'In the except block, append the original v to bad and continue.',
    'Ages above 120 or below 0 are bad too, even though int() accepts them.',
  ],
  solution: `def parse_ages(values):
    ages = []
    bad = []
    for v in values:
        try:
            age = int(v)
        except ValueError:
            bad.append(v)
            continue
        if 0 <= age <= 120:
            ages.append(age)
        else:
            bad.append(v)
    return ages, bad`,
  explanation:
    'Catching only ValueError keeps real bugs visible, and returning the bad values instead of dropping them lets the caller count and inspect them: the habit every cleaning step should have.',
  tests: `ages, bad = parse_ages(["34", "x", "7", "", "250", "-1", " 41 "])
assert ages == [34, 7, 41], ages
assert bad == ["x", "", "250", "-1"], bad`,
};

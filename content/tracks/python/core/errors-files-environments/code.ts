// Code for "Errors, files and environments". Runnable examples were run with CPython 3.13 and their output
// copied; content/tracks/python/python-outputs.test.ts re-runs them. The parser explorer's outcomes were
// recorded by src/lib/pycourse/fixtures/parse_amount.py.
import { span } from '@/lib/foundations/annotate';
import { recordedExperiment, recordedSlots, type RecordedFixture } from '@/lib/pycourse/recorded';
import fixture from '@/lib/pycourse/fixtures/parse_amount.json';
import type { CodeExample } from '@/lib/types';

const parse = fixture as RecordedFixture;
const SRC = parse.template;

export const experiment = recordedExperiment('py-parse-amount', parse, 'Input');

export const parseCode: CodeExample = {
  id: 'py-parse-amount-code',
  language: 'python',
  source: SRC,
  slots: recordedSlots(parse),
  annotations: [
    {
      id: 'try',
      ...span(SRC, 2, 'try:'),
      kind: 'syntax',
      title: 'try',
      what: 'Runs the indented block. If an exception is raised there, Python looks for a matching except.',
      why: 'Keep the try block small, so you only catch errors from the line you expect to fail.',
    },
    {
      id: 'replace',
      ...span(SRC, 3, 'text.replace(",", "")'),
      kind: 'function',
      title: 'Removing thousands separators',
      what: 'Turns "1,250.5" into "1250.5", which float() accepts.',
      why: 'If text is not a string (None, an int), this line raises AttributeError, which the except below does not catch.',
    },
    {
      id: 'except',
      ...span(SRC, 4, 'except ValueError:'),
      kind: 'syntax',
      title: 'except ValueError',
      what: 'Catches only ValueError, which float() raises for text that is not a number.',
      why: 'Catching one specific type means unexpected problems (wrong types, bugs) still surface instead of turning into silent Nones.',
    },
    {
      id: 'raise',
      ...span(SRC, 7, 'raise ValueError(f"negative amount: {value}")'),
      kind: 'syntax',
      title: 'raise',
      what: 'Stops the function and sends a ValueError with a message to the caller.',
      why: 'Some bad data should not be quietly skipped. Raising makes the caller decide.',
    },
    {
      id: 'input',
      ...span(SRC, 10, '{{text}}'),
      kind: 'variable',
      title: 'The input',
      what: 'The value chosen above.',
      why: 'Real columns contain all of these: separators, words, blanks, negatives, NaN, and the occasional non-string.',
      inputs: 'the input chosen above',
    },
  ],
};

/** try / except / else / finally, raising with a cause, and catching several types. */
export const exceptionsRunner: CodeExample = {
  id: 'py-errors-exceptions',
  language: 'python',
  run: 'pyodide',
  source: `import json

def load_config(text):
    try:
        config = json.loads(text)
    except json.JSONDecodeError as e:
        raise ValueError(f"config is not valid JSON (line {e.lineno})") from e
    else:
        print("parsed", len(config), "keys")
    finally:
        print("done trying")
    if "lr" not in config:
        raise KeyError("lr")
    return config

print(load_config('{"lr": 0.01, "epochs": 5}'))

for bad in ['{"epochs": 5}', '{"lr": 0.01,}']:
    try:
        load_config(bad)
    except (KeyError, ValueError) as e:
        print(type(e).__name__, e, "| caused by:", type(e.__cause__).__name__)`,
  annotations: [],
  expectedOutput: `parsed 2 keys
done trying
{'lr': 0.01, 'epochs': 5}
parsed 1 keys
done trying
KeyError 'lr' | caused by: NoneType
done trying
ValueError config is not valid JSON (line 1) | caused by: JSONDecodeError`,
};

/** pathlib, with-blocks, CSV and JSON, in a temporary folder. */
export const filesRunner: CodeExample = {
  id: 'py-errors-files',
  language: 'python',
  run: 'pyodide',
  source: `import csv
import json
import tempfile
from pathlib import Path

with tempfile.TemporaryDirectory() as tmp:
    folder = Path(tmp) / "run_01"
    folder.mkdir()

    rows = [{"step": 1, "loss": 0.92}, {"step": 2, "loss": 0.61}]
    with open(folder / "metrics.csv", "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["step", "loss"])
        writer.writeheader()
        writer.writerows(rows)

    (folder / "config.json").write_text(json.dumps({"lr": 0.01}))

    print(sorted(p.name for p in folder.iterdir()))
    with open(folder / "metrics.csv", newline="") as f:
        for row in csv.DictReader(f):
            print(row, float(row["loss"]) * 2)
    print(json.loads((folder / "config.json").read_text())["lr"])
    print((folder / "metrics.csv").suffix, (folder / "metrics.csv").stem)`,
  annotations: [],
  expectedOutput: `['config.json', 'metrics.csv']
{'step': '1', 'loss': '0.92'} 1.84
{'step': '2', 'loss': '0.61'} 1.22
0.01
.csv metrics`,
};

/** Creating and using a virtual environment (shell commands; nothing here runs in the browser). */
export const venvCommands: CodeExample = {
  id: 'py-errors-venv',
  language: 'bash',
  source: `# once per project
python -m venv .venv                 # create the environment in .venv/
source .venv/bin/activate            # macOS / Linux
# .venv\\Scripts\\activate             # Windows (PowerShell or cmd)

python -m pip install numpy pandas   # installs into .venv only
python -m pip freeze > requirements.txt

# on another machine, or in CI
python -m venv .venv && source .venv/bin/activate
python -m pip install -r requirements.txt`,
  annotations: [],
};

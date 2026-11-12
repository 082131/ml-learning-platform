// Code for python/project/end-to-end. starter.py runs in the browser (Pyodide) and was also run with
// CPython 3.13 (NumPy 2.5.3, pandas 3.0.5 and 3.1.1); the output is identical. The reference numbers quoted in
// the lesson come from a complete solution run with NumPy 2.5.3, pandas 3.1.1 and PyTorch 2.14.1 on CPU.
import { lineOf, span } from '@/lib/foundations/annotate';
import type { CodeExample, ProjectBrief } from '@/lib/types';

export const setupCode: CodeExample = {
  id: 'py-project-setup',
  language: 'bash',
  source: `python3 -m venv .venv
source .venv/bin/activate            # Windows: .venv\\Scripts\\activate
pip install numpy==2.5.3 pandas==3.1.1 matplotlib==3.10.8 torch==2.14.1 pytest==9.2.0
python starter.py                    # writes raw_customers.csv and profiles it
pytest                               # runs your tests for clean.py`,
  annotations: [],
};

const STARTER = `import numpy as np
import pandas as pd

def make_raw(n=2000, seed=7):
    """A messy customer table, built the way real exports go wrong. Do not clean it here."""
    rng = np.random.default_rng(seed)
    plan = rng.choice(["basic", "pro", "team"], size=n, p=[0.5, 0.35, 0.15])
    tenure = rng.integers(1, 61, size=n)                     # months since signup
    sessions = rng.poisson(np.where(plan == "basic", 9, 16))
    tickets = rng.poisson(0.6 + 0.04 * np.maximum(0, 20 - sessions))
    fee = np.select([plan == "basic", plan == "pro"], [12.0, 39.0], 99.0)
    logit = -0.6 + 0.8 * tickets - 0.09 * sessions - 0.035 * tenure + 0.6 * (plan == "basic")
    churned = (rng.random(n) < 1 / (1 + np.exp(-logit))).astype(int)
    df = pd.DataFrame({
        "customer_id": np.arange(10001, 10001 + n),
        "plan": plan,
        "monthly_fee": [f"\${f:,.2f}" for f in fee],
        "tenure_months": tenure,
        "sessions_30d": sessions,
        "tickets_90d": tickets,
        "age": rng.integers(18, 75, size=n),
        "churned": churned,
    })
    # What goes wrong in exports: messy labels, sentinels, impossible values, gaps and duplicates.
    df["plan"] = df["plan"].where(rng.random(n) > 0.15, df["plan"].str.upper() + " ")
    df.loc[rng.random(n) < 0.04, "sessions_30d"] = -1                    # -1 means "not tracked"
    df.loc[rng.random(n) < 0.01, "age"] = 999                             # placeholder age
    df["age"] = df["age"].astype("float64")
    df.loc[rng.random(n) < 0.05, "age"] = np.nan
    df.loc[rng.random(n) < 0.02, "monthly_fee"] = "n/a"
    dupes = df.sample(40, random_state=seed)
    return pd.concat([df, dupes]).sample(frac=1, random_state=seed).reset_index(drop=True)

raw = make_raw()
raw.to_csv("raw_customers.csv", index=False)

df = pd.read_csv("raw_customers.csv")
print(df.shape)
print(df.head(3).to_string())
print("missing:", df.isna().sum()[lambda s: s > 0].to_dict())
print("duplicate rows:", df.duplicated().sum())
print("plan labels:", sorted(df["plan"].unique()))
print("sessions_30d == -1:", (df["sessions_30d"] == -1).sum(), "| age 999:", (df["age"] == 999).sum())
print("churn rate (raw rows):", round(df["churned"].mean(), 3))`;
const at = (match: string) => span(STARTER, lineOf(STARTER, match), match);

export const starterCode: CodeExample = {
  id: 'py-project-starter',
  language: 'python',
  run: 'pyodide',
  source: STARTER,
  annotations: [
    {
      id: 'rng',
      ...at('np.random.default_rng(seed)'),
      kind: 'framework',
      title: 'A seeded generator',
      what: 'Every random choice below comes from this generator, so the same seed gives the same table everywhere.',
      why: 'Your numbers will match the reference numbers in this lesson, in the browser and on your computer.',
    },
    {
      id: 'logit',
      ...at('logit = -0.6 + 0.8 * tickets - 0.09 * sessions - 0.035 * tenure + 0.6 * (plan == "basic")'),
      kind: 'math',
      title: 'How churn was generated',
      what: 'The true churn probability: more support tickets raise it; more sessions, longer tenure and a paid plan lower it.',
      why: 'Because you know the truth, you can check whether your analysis and your model recover it. Real data never tells you.',
    },
    {
      id: 'mess',
      ...at('df["plan"] = df["plan"].where(rng.random(n) > 0.15, df["plan"].str.upper() + " ")'),
      kind: 'variable',
      title: 'Injected problems',
      what: 'About 15% of plan labels become upper case with a trailing space; the next lines add sentinels, impossible ages, gaps and duplicates.',
      why: 'Each one is a problem from the cleaning chapter. Finding all of them is milestone 1.',
    },
    {
      id: 'na',
      ...at('df.loc[rng.random(n) < 0.02, "monthly_fee"] = "n/a"'),
      kind: 'variable',
      title: '"n/a" in a text column',
      what: 'pandas.read_csv treats the string n/a as missing by default, so these show up as NaN after reading.',
      why: 'Other placeholders (such as -1 or 999) are not recognized and stay as values.',
    },
    {
      id: 'profile',
      ...at('print("missing:", df.isna().sum()[lambda s: s > 0].to_dict())'),
      kind: 'syntax',
      title: 'Missing counts per column',
      what: 'isna().sum() counts the gaps per column; the lambda keeps only columns that have some.',
      why: 'A first profile: shape, a few rows, gaps, duplicates, label spellings and suspicious values.',
    },
  ],
  expectedOutput: `(2040, 8)
   customer_id   plan monthly_fee  tenure_months  sessions_30d  tickets_90d   age  churned
0        11965  basic      $12.00             56             4            1  43.0        0
1        10432  basic      $12.00             46             9            1  31.0        1
2        10708  basic      $12.00             17             8            2  36.0        1
missing: {'monthly_fee': 43, 'age': 114}
duplicate rows: 40
plan labels: ['BASIC ', 'PRO ', 'TEAM ', 'basic', 'pro', 'team']
sessions_30d == -1: 81 | age 999: 20
churn rate (raw rows): 0.206`,
};

export const brief: ProjectBrief = {
  goal: 'Turn a messy export of 2,040 subscription customers into a clean, validated table, find out which customers churn and by how much, and train a PyTorch model that predicts churn better than a constant baseline. Report every number with how you got it.',
  dataset:
    'Generated by starter.py with a fixed seed (no download): customer_id, plan, monthly_fee, tenure_months, sessions_30d, tickets_90d, age and churned (1 if the customer left). The export has duplicate rows, inconsistent plan labels, fees stored as text, a -1 sentinel, impossible ages and missing values.',
  milestones: [
    'Run starter.py and profile raw_customers.csv. List every data problem you find, with a count for each (there are at least six kinds).',
    'Write clean_customers(raw) in clean.py and tests for it in test_clean.py (one test per problem, on small hand-made DataFrames). It must return 2,000 unique customers and must not drop rows just because a value is missing.',
    'Add validation checks that run after cleaning and raise on failure: unique customer_id, plan in {basic, pro, team}, fees positive, tenure 1 to 60, churned in {0, 1}, age missing or between 16 and 100.',
    'Analyze: churn rate by plan, churn rate by number of support tickets, with one chart each. Give a 95% bootstrap interval for the difference in churn rate between basic and pro.',
    'Split 60/20/20 into train, validation and test with a seed. Fit imputation and scaling on the training rows only. Compute the validation log loss of a baseline that predicts the training churn rate for everyone.',
    'In PyTorch, train a logistic regression (one nn.Linear) and a small MLP with the training loop from the last lesson, keeping the epoch with the lowest validation loss. Compare both with the baseline on validation log loss and ROC AUC.',
    'Choose one model, evaluate it once on the test set, and write README.md: data problems and fixes, analysis results with intervals, a model comparison table, and the limitations of your conclusions.',
  ],
  rubric: [
    {
      criterion: 'Cleaning is tested and nothing is lost silently',
      detail:
        'Each fix has a test; row counts before and after each step are printed; missing values stay missing or are filled with a stated rule and an indicator.',
    },
    {
      criterion: 'No leakage',
      detail:
        'Duplicates removed before splitting; medians, means and standard deviations come from training rows; the test set is used once.',
    },
    {
      criterion: 'Claims come with uncertainty',
      detail:
        'Differences between groups are reported with a bootstrap interval or a permutation test, not as bare point estimates.',
    },
    {
      criterion: 'Honest model comparison',
      detail:
        'Both models are compared with the baseline on the same validation rows and metrics, and the report says plainly if the MLP is not better.',
    },
    {
      criterion: 'Reproducible',
      detail: 'Pinned versions, fixed seeds, and one command per step; someone else gets your numbers.',
    },
  ],
  hints: [
    'read_csv already turns "n/a" into NaN. Fees can then be parsed with str.replace(r"[$,]", "", regex=True) and pd.to_numeric, and a missing fee can be filled from the plan (each plan has one price).',
    'The duplicates are exact copies, so drop_duplicates() finds all 40. Check that customer_id is unique afterwards.',
    'Turn sessions_30d == -1 into NaN plus a boolean sessions_missing column before imputing: whether a value was tracked can itself be informative.',
    'Accuracy is misleading here: predicting "no churn" for everyone is right about 78% of the time. Use log loss and ROC AUC; AUC can be computed from ranks as in the statistics lesson.',
    'The data was generated with a churn logit that is linear in the features, so do not expect the MLP to win. Report what you find.',
  ],
};

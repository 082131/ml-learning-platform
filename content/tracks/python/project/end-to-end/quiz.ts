import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'baseline-loss',
    type: 'numeric',
    prompt:
      'A baseline predicts churn probability 0.2 for every customer, and exactly 20% of customers churn. What is its mean binary cross-entropy (natural log)? Give 3 decimals.',
    answer: 0.5,
    tolerance: 0.005,
    hint: 'Average −ln p over churners and −ln(1 − p) over the rest: 0.2 · (−ln 0.2) + 0.8 · (−ln 0.8).',
    explain:
      '0.2 · 1.609 + 0.8 · 0.223 = 0.322 + 0.179 = 0.500. A model is only useful if its validation loss is clearly below this.',
  },
  {
    id: 'accuracy',
    type: 'choice',
    prompt:
      'The baseline that always predicts "no churn" has 77.7% validation accuracy. What does that tell you?',
    options: [
      {
        text: 'Any model under 77.7% accuracy is worse than useless',
        correct: false,
        explain:
          'A model can rank customers well (high AUC) and still lose on accuracy at the 0.5 threshold, which is not the cutoff a business would pick anyway.',
      },
      {
        text: 'About 22% of validation customers churned',
        correct: true,
        explain:
          'That is all it says: accuracy of the constant prediction equals the share of the majority class. It is why the brief asks for log loss and AUC instead.',
      },
      {
        text: 'The features carry little information about churn',
        correct: false,
        explain: 'The baseline ignores the features entirely, so its accuracy says nothing about them.',
      },
      {
        text: 'The validation split is unbalanced and must be redrawn',
        correct: false,
        explain:
          'Churn is simply the rarer outcome; a 60/20/20 random split keeps roughly the same rate in each part.',
      },
    ],
  },
  {
    id: 'dupes-first',
    type: 'choice',
    prompt: 'Why must the 40 duplicate rows be removed before the train/validation/test split, not after?',
    options: [
      {
        text: 'drop_duplicates() is slower on smaller tables',
        correct: false,
        explain: 'Speed is not the issue; the order matters for what ends up in each split.',
      },
      {
        text: 'Otherwise the churn rate would be computed wrongly',
        correct: false,
        explain:
          'Forty copies barely move the rate; the real problem is a copy landing on both sides of the split.',
      },
      {
        text: 'A copy could land in both train and test',
        correct: true,
        explain: 'The model would then be tested on rows it has already seen, which inflates the test score.',
      },
    ],
  },
  {
    id: 'impute-where',
    type: 'choice',
    prompt: 'Which median should fill missing ages in the validation and test rows?',
    options: [
      {
        text: 'The median of all 2,000 cleaned rows',
        correct: false,
        explain: 'That uses validation and test rows to build a training input: a small but real leak.',
      },
      {
        text: 'The median of the training rows',
        correct: true,
        explain: 'Fit every preprocessing step on training rows and apply the same numbers everywhere.',
      },
      {
        text: 'Each split’s own median',
        correct: false,
        explain:
          'Then the same age gap gets different values in different splits, and test rows influence their own inputs.',
      },
    ],
  },
  {
    id: 'mlp-equal',
    type: 'choice',
    prompt:
      'Your MLP and your logistic regression reach the same validation log loss (0.430). Which conclusion fits?',
    options: [
      {
        text: 'Report the MLP, since it is the more powerful model',
        correct: false,
        explain:
          'Equal scores give no reason to prefer the more complex model; it is harder to explain and maintain.',
      },
      {
        text: 'Train the MLP longer until it wins',
        correct: false,
        explain:
          'Tuning until a preferred model wins on validation turns the validation set into a training signal.',
      },
      {
        text: 'Prefer logistic regression and say why',
        correct: true,
        explain:
          'The extra capacity bought nothing on this data (whose churn logit is linear). The simpler model is easier to explain, and its coefficients are readable.',
      },
      {
        text: 'Both models are broken, so start over',
        correct: false,
        explain: 'Both clearly beat the 0.531 baseline; they simply found the same signal.',
      },
    ],
  },
];

export const planExercise: Exercise = {
  id: 'py-project-clean-plan',
  prompt:
    'Write clean_plan(s) that strips and lower-cases plan labels and returns a categorical with exactly the categories basic, pro and team.',
  starter: `import pandas as pd

PLANS = ["basic", "pro", "team"]

def clean_plan(s):
    return s.str.lower()          # misses spaces, unknown labels and the dtype`,
  hints: [
    'Chain .str.strip() and .str.lower().',
    'pd.Categorical(values, categories=PLANS) turns any value outside PLANS into NaN.',
    'Wrap it in pd.Series(..., index=s.index) to keep the original index.',
  ],
  solution: `import pandas as pd

PLANS = ["basic", "pro", "team"]

def clean_plan(s):
    cleaned = s.str.strip().str.lower()
    return pd.Series(pd.Categorical(cleaned, categories=PLANS), index=s.index)`,
  explanation:
    'Fixing the allowed categories up front means a typo or a new plan shows up as a missing value your validation step can catch, instead of quietly becoming a fourth category.',
  tests: `import pandas as pd
raw = pd.Series(["Basic", "PRO ", " team", "pro", "gold"], index=[10, 11, 12, 13, 14])
out = clean_plan(raw)
assert isinstance(out.dtype, pd.CategoricalDtype), out.dtype
assert list(out.cat.categories) == ["basic", "pro", "team"], out.cat.categories
assert out.iloc[:4].tolist() == ["basic", "pro", "team", "pro"], out.tolist()
assert pd.isna(out.iloc[4]), "an unknown plan should become missing, not a new category"
assert list(out.index) == [10, 11, 12, 13, 14], "keep the original index"`,
};

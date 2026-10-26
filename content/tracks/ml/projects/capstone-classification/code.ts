// Code for ml/projects/capstone-classification. baseline.py was run with the pinned versions below
// (CPython 3.13.16, scikit-learn 1.9.1, MLflow 3.17.2); the output shown is from that run.
import type { CodeExample, ProjectBrief } from '@/lib/types';

export const setupCode: CodeExample = {
  id: 'capstone-classification-setup',
  language: 'bash',
  source: `python3 -m venv .venv
source .venv/bin/activate            # Windows: .venv\\Scripts\\activate
pip install numpy==2.5.4 pandas==3.1.0 scikit-learn==1.9.1 mlflow==3.17.2 pytest==9.1.1
pip freeze > requirements.txt        # commit this file with your code
python baseline.py
mlflow ui                            # http://127.0.0.1:5000, reads ./mlflow.db`,
  annotations: [],
};

export const baselineCode: CodeExample = {
  id: 'capstone-classification-baseline',
  language: 'python',
  source: `import mlflow
from sklearn.datasets import load_breast_cancer
from sklearn.dummy import DummyClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, recall_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

SEED = 42
data = load_breast_cancer(as_frame=True)
X, y = data.data, data.target  # target 0 = malignant, 1 = benign
X_rest, X_test, y_rest, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=SEED)
X_train, X_val, y_train, y_val = train_test_split(
    X_rest, y_rest, test_size=0.25, stratify=y_rest, random_state=SEED)
print(f"train {len(X_train)}, val {len(X_val)}, test {len(X_test)} (test is not used yet)")

mlflow.set_experiment("capstone-classification")
models = {
    "majority class": DummyClassifier(strategy="most_frequent"),
    "logistic regression": make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000)),
}
for name, model in models.items():
    with mlflow.start_run(run_name=name):
        model.fit(X_train, y_train)
        pred = model.predict(X_val)
        acc = accuracy_score(y_val, pred)
        recall = recall_score(y_val, pred, pos_label=0)  # share of malignant cases found
        mlflow.log_params({"model": name, "seed": SEED})
        mlflow.log_metrics({"val_accuracy": acc, "val_recall_malignant": recall})
        print(f"{name:<20} val accuracy {acc:.3f}  recall (malignant) {recall:.3f}")`,
  annotations: [
    {
      id: 'target',
      range: { line: 12 },
      kind: 'variable',
      title: 'Which class is positive?',
      what: 'In this dataset 0 means malignant and 1 benign.',
      why: 'Many metric functions treat 1 as the positive class by default. Here the case you must not miss is 0, so pass pos_label=0.',
    },
    {
      id: 'split',
      range: { line: 13 },
      kind: 'function',
      title: 'Hold out the test set first',
      what: 'A stratified 20% test split, then a 25% validation split of the rest: 60/20/20 overall.',
      why: 'Stratifying keeps the malignant share equal in every split. The test set stays untouched until the very end.',
    },
    {
      id: 'dummy',
      range: { line: 20 },
      kind: 'framework',
      title: 'A baseline that learns nothing',
      what: 'Always predicts the most common class (benign).',
      why: 'It shows what accuracy alone rewards: 62% accuracy while finding no malignant case at all.',
    },
    {
      id: 'pipeline',
      range: { line: 21 },
      kind: 'framework',
      title: 'Scaling inside the pipeline',
      what: 'StandardScaler is fitted on the training rows only, as part of the model.',
      why: 'Fitting the scaler on all data before splitting would leak validation statistics into training.',
    },
    {
      id: 'recall',
      range: { line: 28 },
      kind: 'framework',
      title: 'Recall for the malignant class',
      what: 'The share of malignant validation cases the model flags.',
      why: 'Missing a malignant case costs more than a false alarm, so this metric matters more than accuracy.',
    },
    {
      id: 'log',
      range: { line: 30 },
      kind: 'framework',
      title: 'Every run is recorded',
      what: 'Parameters and validation metrics go into ./mlflow.db; mlflow ui shows them side by side.',
      why: 'Your final report must be able to point at the runs behind every claim.',
    },
  ],
};

export const baselineOutput: CodeExample = {
  id: 'capstone-classification-output',
  language: 'bash',
  source: `python baseline.py
# train 341, val 114, test 114 (test is not used yet)
# (MLflow prints a few INFO lines the first time it creates mlflow.db)
# majority class       val accuracy 0.623  recall (malignant) 0.000
# logistic regression  val accuracy 0.991  recall (malignant) 0.977`,
  annotations: [],
};

export const brief: ProjectBrief = {
  goal: 'Build a classifier that flags malignant breast tumors from 30 measurements of cell nuclei, as a small but complete system: data checks, a baseline, tracked experiments, a chosen operating threshold, tests that gate the model, one honest test-set evaluation and a model card.',
  dataset:
    'The Wisconsin Diagnostic Breast Cancer data bundled with scikit-learn (`load_breast_cancer`): 569 tumors, 30 numeric features (the mean, standard error and worst value of 10 measurements), 212 malignant and 357 benign. No download is needed. It is a teaching dataset, not a basis for medical decisions.',
  milestones: [
    'Set up the pinned environment, run baseline.py and find both runs in mlflow ui',
    'Write pytest data checks: 30 numeric columns, no missing values, the expected class counts, and no row in both train and test',
    'Choose the metric and operating point: a minimum recall for malignant (for example 0.98) and the precision you get there, with a written reason',
    'Compare at least three model families with 5-fold cross-validation on the training rows, every run tracked',
    'Tune the best family with random search and pick the decision threshold on validation data',
    'Run an error analysis (which cases are missed?) and an ablation of the three feature groups (mean, error, worst)',
    'Add model tests: the metric gate at your operating point, a directional test, and a check that predictions are probabilities',
    'Evaluate once on the test set with a bootstrap interval and write a model card: data, metric, results, limits, how to reproduce',
  ],
  rubric: [
    {
      criterion: 'Problem framing',
      detail:
        'States who uses the output and why missing a malignant case costs more than a false alarm; the metric and threshold follow from that.',
    },
    {
      criterion: 'Data and leakage',
      detail:
        'Splits are stratified and fixed by a seed; preprocessing is fitted inside the pipeline; the test set is used once.',
    },
    {
      criterion: 'Experiments',
      detail: 'Every number in the report links to a tracked run with its parameters, seed and code version.',
    },
    {
      criterion: 'Model choice',
      detail:
        'The final model is justified against the baseline and the alternatives, with cross-validation spread, not a single score.',
    },
    {
      criterion: 'Evaluation',
      detail:
        'Reports recall and precision at the chosen threshold, a confusion matrix and a bootstrap interval; errors are inspected, not just counted.',
    },
    {
      criterion: 'Testing',
      detail: 'pytest runs the data checks and model tests and fails when a check is broken on purpose.',
    },
    {
      criterion: 'Reproducibility',
      detail: 'A fresh clone, pip install -r requirements.txt and one command reproduces the final numbers.',
    },
    {
      criterion: 'Communication',
      detail:
        'The model card states limits plainly: small dataset, one source, not validated for clinical use.',
    },
  ],
  hints: [
    'Use `predict_proba(X)[:, 0]` for the probability of malignant; the column order follows `model.classes_`.',
    '`sklearn.metrics.precision_recall_curve` gives every threshold at once; pass the malignant probability and labels where malignant is 1.',
    'With 114 test rows one missed malignant case moves recall by about 0.024, so report intervals, not just point values.',
    '`cross_validate(..., scoring=["recall", "precision"], return_train_score=True)` shows both the score and how much it varies across folds.',
    'For the ablation, refit with each feature group removed, keeping the splits and seeds fixed.',
  ],
};

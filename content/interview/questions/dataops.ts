import type { InterviewQuestion } from '@/lib/interview/types';

// ML Data Operations: labels, data quality, drift, versioning and governance for ML systems.
export const dataopsQuestions: InterviewQuestion[] = [
  {
    id: 'dops-kappa',
    role: 'dataops',
    kind: 'technical',
    level: 'core',
    topic: 'Labeling',
    prompt:
      'Two annotators agree on 90% of items. Is the labeling good? What would you measure instead, and what do you do when agreement is low?',
    answer: `Raw agreement can be high by chance alone. If 90% of items are negative and both annotators say "negative" almost every time, they will agree about 82% of the time without looking at the data. So 90% might be barely better than chance.

I would report a chance-corrected statistic: Cohen's kappa for two annotators, Fleiss' kappa or Krippendorff's alpha for more, the last of which also handles missing ratings. Kappa is observed agreement minus expected agreement, divided by one minus expected agreement. I would also look at the confusion between annotators per class, because the summary hides where they disagree.

Low agreement is information about the task, not only about the people. I read the disagreements and usually find ambiguous guidelines or classes that overlap. The fixes are to sharpen the guidelines with worked examples of the hard cases, merge or redefine classes, add an "unsure" option, train annotators on a gold set, and send disputed items to an expert. Agreement between annotators is also a ceiling on what a model can be expected to score.`,
    covers: [
      'Chance agreement under class imbalance',
      'Cohen, Fleiss or Krippendorff, with the formula idea',
      'Reads disagreements; fixes guidelines and class definitions',
      'Agreement as a ceiling for model performance',
    ],
    redFlags: ['Accepting 90% as good', 'Blaming annotators without reading the disagreements'],
    followUps: [
      'Kappa is low although raw agreement is 95%. How can that be?',
      'How many items would you double-annotate?',
    ],
  },
  {
    id: 'dops-label-noise',
    role: 'dataops',
    kind: 'technical',
    level: 'core',
    topic: 'Label quality',
    prompt:
      'You suspect about 8% of your training labels are wrong. How do you find them without re-labeling everything, and does it matter?',
    answer: `It matters most in two places. Noise in the test set corrupts the measurement itself, so I fix that first. Noise in training is tolerated fairly well when it is random, but systematic noise, where one class is regularly mislabeled as another, teaches the model the mistake.

To find candidates cheaply I use the model as a detector. I get out-of-sample predicted probabilities for every training row through cross-validation, so no row is scored by a model that saw it. Rows where the model is confident in a different class than the given label are suspects. Confident learning formalizes this with per-class thresholds and estimates the joint distribution of given and true labels. Other signals are high loss late in training and disagreement among nearest neighbours in embedding space.

That gives a ranked list, not a verdict: hard but correct examples and rare subgroups also rank high, so deleting automatically would remove exactly the cases the model needs. I send the top of the list to human review, measure what fraction really were errors, correct them, and feed recurring confusions back into the labeling guidelines.`,
    covers: [
      'Test-set noise versus training noise; random versus systematic',
      'Out-of-sample probabilities via cross-validation',
      'Confident learning or loss-based ranking',
      'Human review of the ranked list; no automatic deletion',
    ],
    redFlags: [
      'Using in-sample predictions to flag errors',
      'Dropping every disagreeing row',
      'Ignoring the test set',
    ],
    followUps: [
      'Why must the probabilities be out-of-sample?',
      'How would you estimate the noise rate per class?',
    ],
  },
  {
    id: 'dops-weak-supervision',
    role: 'dataops',
    kind: 'technical',
    level: 'senior',
    topic: 'Programmatic labeling',
    prompt:
      'You have 2 million unlabeled support tickets and a budget to hand-label 2,000. How do you build a training set?',
    answer: `I split the budget. A few hundred hand labels go into a gold test set that nothing else touches, sampled to represent real traffic, because without it I cannot tell whether anything else worked. A smaller gold development set is for tuning.

For training labels I would use programmatic labeling. Domain experts write labeling functions: keyword rules, patterns, lookups in existing metadata, the output of an older model or a large language model with a prompt. Each function votes or abstains. They are noisy and they conflict, so instead of a majority vote I fit a label model that estimates each function's accuracy from how the functions agree and disagree with each other, and outputs a probabilistic label per ticket. I check each function's coverage and its accuracy on the development set.

A classifier trained on those probabilistic labels generalizes beyond the rules, to tickets no function covered.

The remaining hand-label budget goes where it helps most: active learning picks examples the model is least sure about or where functions conflict. I would watch for classes the functions never cover, since the model cannot learn what was never labeled.`,
    covers: [
      'Gold test set first, kept separate',
      'Labeling functions that vote or abstain; coverage and accuracy',
      'A label model rather than majority vote; probabilistic labels',
      'End model generalizes; active learning for the rest of the budget',
    ],
    redFlags: [
      'Spending the whole budget on training labels',
      'Evaluating on programmatically labeled data',
      'Trusting LLM labels without a gold check',
    ],
    followUps: [
      'Two labeling functions are near-copies of each other. Why is that a problem?',
      'How do you decide when the labels are good enough?',
    ],
  },
  {
    id: 'dops-drift',
    role: 'dataops',
    kind: 'technical',
    level: 'core',
    topic: 'Drift',
    prompt:
      'Explain covariate shift, label shift and concept drift. How do you detect each, and which ones does retraining on recent data fix?',
    answer: `Covariate shift: the distribution of inputs changes while the relationship between inputs and label stays the same. For example, more traffic from a new country. I detect it by comparing each feature's recent distribution with the training baseline, using the population stability index or a Kolmogorov-Smirnov test for numeric features and a chi-square test for categorical ones, or by training a classifier to tell old rows from new; if it can, the data moved.

Label shift: the class balance changes, such as fraud doubling, while each class looks the same. It shows in the distribution of predictions and, when labels arrive, in the base rate. Calibration breaks even if ranking holds.

Concept drift: the relationship itself changes; the same input now deserves a different label, as when fraudsters change tactics. Input monitoring may show nothing. Only labeled outcomes reveal it, as a falling metric on recent data.

Retraining on recent data fixes all three if recent labels exist, but for concept drift old data becomes misleading and should be down-weighted or dropped. Not every detected shift hurts the model, so I alert on drift but trigger retraining on measured or estimated performance.`,
    covers: [
      'Clear definitions with an example each',
      'PSI, KS, chi-square or a domain classifier for inputs',
      'Prediction distribution and base rate for label shift',
      'Concept drift needs labels; what retraining does and does not fix',
    ],
    redFlags: [
      'Using "drift" for everything',
      'Retraining on every alert',
      'Claiming concept drift is visible in inputs',
    ],
    followUps: [
      'A PSI of 0.3 on one feature: what do you do next?',
      'With a million rows, every KS test is significant. How do you set thresholds?',
    ],
  },
  {
    id: 'dops-versioning',
    role: 'dataops',
    kind: 'technical',
    level: 'core',
    topic: 'Reproducibility',
    prompt:
      'An auditor asks you to reproduce the exact model that made a decision eight months ago. What must you have saved to do it?',
    answer: `A model is a function of code, data, configuration and environment, so I need all four pinned, plus the link from the decision to the model.

The decision log records which model version served that request, with the input features as they were at that moment. The model registry maps that version to a training run. The run records the code commit, the hyperparameters and random seeds, and the environment as a container image digest or a lock file.

Data is the part most often missing. The training set has to be an immutable snapshot identified by a content hash or a table version, not "the customers table", which has since changed. Table formats with time travel or a data versioning tool give that, together with the query and the feature definitions used. The same applies to the validation data and the reported metrics.

With those I can rebuild the model. I would be honest that bit-for-bit equality is not always achievable on GPUs, because some operations are non-deterministic, so I also keep the original artifact itself and show that the rebuilt model agrees within a stated tolerance. Retention periods and deletion requests need a policy, because old snapshots contain personal data.`,
    covers: [
      'Decision to model version to training run lineage',
      'Code commit, config, seeds, environment digest',
      'Immutable, hashed data snapshots, not live tables',
      'Limits of determinism; keep the artifact; retention versus deletion',
    ],
    redFlags: ['"We have the code in git"', 'Pointing at a mutable table as the training data'],
    followUps: [
      'A user asks for their data to be deleted. What happens to old snapshots and models?',
      'How do you version a 2 TB dataset without copying it each time?',
    ],
  },
  {
    id: 'dops-validation',
    role: 'dataops',
    kind: 'technical',
    level: 'core',
    topic: 'Validation',
    prompt:
      'What checks belong at the entrance of a training pipeline, and what should happen when one fails?',
    answer: `I think in four layers. Schema: expected columns exist with the expected types, and no unexpected ones appear. Completeness and validity: null rates per column, values within allowed ranges or sets, unique keys, no duplicate rows. Volume and freshness: row count close to recent runs, latest timestamp recent enough. Distribution: each important feature's statistics against a baseline, and the label rate, since a label rate that halves overnight usually means a broken join and not a changed world.

For ML specifically I add checks between splits: no entity or time overlap between train and test, and features consistent between the training set and what serving logs.

Thresholds come from history, as a tolerance around normal variation, or every run will alert and people will stop reading.

On failure, severity decides. A broken schema, an empty table or a collapsed label rate stops the pipeline: a stale model is better than one trained on garbage. Mild drift warns and continues. Failing rows can be quarantined so the rest proceeds. Every failure names an owner and shows which check failed with examples, and the checks live in version control beside the pipeline.`,
    covers: [
      'Schema, validity, volume and freshness, distribution',
      'Label-rate check; split overlap; train/serve consistency',
      'Thresholds from historical variation',
      'Blocking versus warning; quarantine; ownership',
    ],
    redFlags: ['Only a schema check', 'Training anyway on failure', 'Alerts with no owner'],
    followUps: ['How do you avoid alert fatigue?', 'Where would you check the same things at serving time?'],
  },
  {
    id: 'dops-privacy',
    role: 'dataops',
    kind: 'technical',
    level: 'senior',
    topic: 'Governance',
    prompt:
      'A teammate says the dataset is safe to share because names and emails were removed. Do you agree?',
    answer: `No. Removing direct identifiers is pseudonymization at best. People can be re-identified from combinations of the remaining fields, known as quasi-identifiers. Postcode, birth date and sex together are unique for most of a population, and free-text fields, timestamps, rare diagnoses or precise locations leak identity too. Anyone who can join the data with another source can undo the removal.

I would first ask who needs the data and for what, and share the minimum: fewer columns, fewer rows, aggregates instead of records if that serves the purpose.

Then reduce re-identification risk: generalize quasi-identifiers, for example age bands and partial postcodes, and suppress small groups so each combination covers at least k people. That has known weaknesses when a group shares the same sensitive value. For published statistics or model training, differential privacy gives a mathematical bound by adding calibrated noise, at a cost in accuracy. Free text needs entity redaction and still a manual sample check.

Around that go controls: access on a need-to-know basis, logging, a retention date, and a legal basis for the use. Models can also memorize training data, so the model itself is in scope.`,
    covers: [
      'Quasi-identifiers and linkage attacks',
      'Data minimization first',
      'Generalization, suppression, k-anonymity and its limits; differential privacy',
      'Access control, retention, legal basis; model memorization',
    ],
    redFlags: ['"No names, so it is anonymous"', 'Hashing emails and calling it anonymized'],
    followUps: [
      'Why is hashing an email address not anonymization?',
      'What does the privacy budget in differential privacy control?',
    ],
  },
  {
    id: 'dops-sd-retraining',
    role: 'dataops',
    kind: 'system-design',
    level: 'senior',
    topic: 'Continuous training',
    prompt:
      'Design the retraining system for a demand-forecasting model: when to retrain, how to validate, how to promote safely.',
    answer: `I would separate three decisions: when to retrain, whether the new model is better, and how to release it.

Triggers. A schedule, weekly, as the baseline, because demand has known seasonality and the cost of retraining is low. On top, event triggers: measured error on recent actuals above a threshold, or strong input drift. Triggers start a pipeline run; they do not deploy anything.

The pipeline. Validate incoming data and stop on failure. Build features with point-in-time correctness from a versioned snapshot. Train. Evaluate by backtesting on rolling time windows, never a random split, against the current production model and a naive seasonal baseline, on the same windows. I look at slices: by store, product family, and promotion periods, because an average hides a store that got worse.

Promotion gates: the challenger must beat the champion beyond noise overall and not regress materially on any important slice, and pass checks on latency and artifact size. Then shadow mode for a period, comparing forecasts without acting on them, then a gradual rollout with automatic rollback if live error exceeds a bound.

Everything is recorded: data version, code, metrics, who or what approved. I would add a manual approval step for major changes, and alerts when no model has been promoted for too long.`,
    covers: [
      'Scheduled plus performance-based triggers; triggers do not deploy',
      'Data validation gate and versioned, point-in-time training data',
      'Backtesting against champion and a naive baseline, by slice',
      'Promotion gates, shadow mode, gradual rollout, rollback',
      'Lineage and approvals',
    ],
    redFlags: [
      'Automatically deploying every retrained model',
      'Random split for a time series',
      'No comparison with the current model on the same data',
    ],
    followUps: [
      'Actuals arrive two weeks late. How do the triggers change?',
      'A promotion campaign unlike any in history starts next week. What do you do?',
    ],
  },
];

import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the dataops/labeling chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'annotation-guidelines',
    term: 'Annotation guidelines',
    short:
      'The written instructions annotators follow: what each label means, worked examples, and rules for the edge cases.',
    long: 'Good guidelines are versioned like code and grow from disagreements: every case two annotators labeled differently becomes a rule or an example. Changing the guidelines changes the meaning of the labels, so labels made under different versions should not be mixed silently.',
    introducedIn: 'dataops/labeling/annotation-agreement',
    aliases: ['labeling guidelines', 'labeling instructions', 'annotation manual'],
  },
  {
    id: 'inter-annotator-agreement',
    term: 'Inter-annotator agreement',
    short: 'How consistently different annotators give the same label to the same item.',
    long: 'Measured on a sample that several people label independently. Raw percent agreement is easy to read but inflated when one label dominates, so chance-corrected measures such as Cohen’s kappa (two annotators) or Fleiss’ kappa and Krippendorff’s alpha (more annotators) are used.',
    introducedIn: 'dataops/labeling/annotation-agreement',
    aliases: ['IAA', 'inter-rater reliability', 'inter-rater agreement'],
  },
  {
    id: 'cohens-kappa',
    term: 'Cohen’s kappa',
    short:
      'Agreement between two annotators corrected for chance: κ = (p_o − p_e) / (1 − p_e).',
    long: 'p_o is the observed share of items both label the same; p_e is the agreement expected if each labeled at random with their own label rates. κ = 1 is perfect agreement, κ = 0 is no better than chance, and negative values are worse than chance.',
    introducedIn: 'dataops/labeling/annotation-agreement',
    aliases: ['kappa', 'Cohen kappa', 'κ'],
  },
  {
    id: 'gold-standard',
    term: 'Gold standard (gold questions)',
    short: 'Items whose correct label is known in advance, mixed into the work to measure each annotator’s accuracy.',
    long: 'Annotators cannot tell gold items from the rest. Their accuracy on them screens out careless or misunderstanding annotators. A gold test set is the same idea applied to model evaluation: expert-labeled examples kept out of training.',
    introducedIn: 'dataops/labeling/annotation-agreement',
    aliases: ['gold labels', 'gold set', 'honeypot questions', 'ground truth'],
  },
  {
    id: 'adjudication',
    term: 'Adjudication',
    short: 'A senior annotator or expert decides the final label where annotators disagree.',
    long: 'Usually combined with consolidation: unanimous items take the shared label, split items go to the adjudicator. Adjudicated cases are the best source of new examples for the guidelines.',
    introducedIn: 'dataops/labeling/annotation-agreement',
    aliases: ['adjudicator', 'label consolidation', 'consensus labeling'],
  },
  {
    id: 'weak-supervision',
    term: 'Weak supervision',
    short:
      'Creating training labels from noisy, cheap sources such as rules, heuristics and other models instead of labeling each example by hand.',
    long: 'Each source is a labeling function that may abstain. Their votes are combined, by majority vote or by a label model that estimates each function’s accuracy, into probabilistic labels for training. Snorkel popularized the approach.',
    introducedIn: 'dataops/labeling/programmatic-labeling',
    aliases: ['programmatic labeling', 'distant supervision', 'Snorkel'],
  },
  {
    id: 'labeling-function',
    term: 'Labeling function',
    short: 'A small program that returns a label for an example, or abstains when it has no opinion.',
    long: 'Typically a keyword rule, a regular expression, a lookup in a knowledge base or an existing model’s prediction above a confidence threshold. Each is judged by coverage, overlap with others, conflicts and accuracy on a small gold set.',
    introducedIn: 'dataops/labeling/programmatic-labeling',
    aliases: ['LF', 'labelling function', 'heuristic labeler'],
  },
  {
    id: 'label-coverage',
    term: 'Coverage (of labeling functions)',
    short: 'The share of examples on which at least one labeling function, or one particular function, does not abstain.',
    long: 'Uncovered examples get no weak label. Raising coverage with broad rules usually lowers accuracy, so coverage and accuracy are always read together.',
    introducedIn: 'dataops/labeling/programmatic-labeling',
    aliases: ['LF coverage'],
  },
  {
    id: 'active-learning',
    term: 'Active learning',
    short: 'Letting the current model choose which unlabeled examples a person should label next.',
    long: 'A loop: train on the labels you have, score the unlabeled pool, send the most informative examples to annotators, repeat. It aims to reach a target accuracy with fewer labels than labeling a random sample.',
    introducedIn: 'dataops/labeling/programmatic-labeling',
    aliases: ['human-in-the-loop labeling', 'pool-based active learning'],
  },
  {
    id: 'uncertainty-sampling',
    term: 'Uncertainty sampling',
    short: 'The active-learning strategy of labeling the examples the model is least sure about, such as probabilities near 0.5.',
    long: 'Variants rank by least confidence, smallest margin between the top two classes, or highest entropy. It can over-sample outliers and noisy regions, so it is often mixed with some random sampling.',
    introducedIn: 'dataops/labeling/programmatic-labeling',
    aliases: ['least-confidence sampling', 'margin sampling', 'entropy sampling'],
  },
  {
    id: 'confident-learning',
    term: 'Confident learning',
    short:
      'A method that finds likely label errors by comparing each example’s given label with out-of-fold predicted probabilities and per-class thresholds.',
    long: 'For each class j, the threshold t_j is the model’s average predicted probability of j over examples labeled j. An example labeled i is flagged when its probability for another class j reaches t_j. The cleanlab library implements it.',
    introducedIn: 'dataops/labeling/label-errors',
    aliases: ['cleanlab', 'label issue detection'],
  },
  {
    id: 'out-of-fold-prediction',
    term: 'Out-of-fold prediction',
    short: 'A prediction for an example made by a model that was not trained on that example, obtained with cross-validation.',
    long: 'Split the data into k folds, train on k − 1, predict the held-out fold, and repeat so every example gets one prediction. In-sample predictions would simply repeat the (possibly wrong) training label.',
    introducedIn: 'dataops/labeling/label-errors',
    aliases: ['cross-validated prediction', 'cross_val_predict', 'out-of-sample prediction'],
  },
  {
    id: 'per-class-threshold',
    term: 'Per-class threshold',
    short: 'A confidence cut-off computed separately for each class, from how confident the model is on that class on average.',
    long: 'Models are often less confident on rare or hard classes. A single fixed cut-off like 0.5 then misses errors in confident classes and over-flags in unconfident ones; per-class thresholds adapt to each.',
    introducedIn: 'dataops/labeling/label-errors',
    aliases: ['class-conditional threshold', 'self-confidence threshold'],
  },
  {
    id: 'precision-recall',
    term: 'Precision and recall',
    short:
      'Precision: of the items flagged, the share that are truly positive. Recall: of the truly positive items, the share that were flagged.',
    long: 'precision = TP / (TP + FP), recall = TP / (TP + FN). For a label audit, precision is how much reviewer time is well spent and recall is how many label errors are found.',
    introducedIn: 'dataops/labeling/label-errors',
    aliases: ['precision', 'recall', 'true positive rate'],
  },
] satisfies GlossaryTerm[];

import type { GlossaryTerm } from '@/lib/types';

const LESSON = 'ml/classical/trees-ensembles';

export default [
  {
    id: 'decision-tree',
    term: 'Decision tree',
    short:
      'A model that predicts by asking a sequence of yes/no questions about the features, such as “bill length ≤ 41.95 mm?”, and answering with the majority class (or mean value) of the training rows that end in the same leaf.',
    long: 'Each inner node holds one test on one feature; each leaf holds a prediction. Training grows the tree greedily from the top: at every node it picks the test that best separates the labels, then repeats on both halves. scikit-learn calls them DecisionTreeClassifier and DecisionTreeRegressor.',
    introducedIn: LESSON,
    aliases: ['tree', 'CART', 'leaf', 'node'],
  },
  {
    id: 'gini-impurity',
    term: 'Gini impurity',
    short:
      'How mixed the labels in a node are: 1 − Σ pₖ², where pₖ is the fraction of the node in class k. 0 for a pure node; 0.5 for a 50/50 split of two classes.',
    long: 'It is the chance that two labels drawn at random (with replacement) from the node differ. A split is scored by the Gini of each side weighted by its share of the rows; the tree keeps the split with the lowest weighted Gini. It is scikit-learn’s default criterion (criterion="gini").',
    introducedIn: LESSON,
    aliases: ['gini', 'impurity'],
  },
  {
    id: 'split-threshold',
    term: 'Split (threshold)',
    short:
      'The test at a tree node: rows with feature ≤ threshold go left, the rest go right. Candidate thresholds are the midpoints between neighboring sorted values.',
    introducedIn: LESSON,
    aliases: ['split', 'threshold', 'candidate threshold'],
  },
  {
    id: 'ensemble',
    term: 'Ensemble',
    short:
      'A model that combines the predictions of several models, for example by voting or by adding them up.',
    long: 'Random forests (many independent trees that vote) and gradient boosting (trees added one after another, each correcting the last) are the two classic tree ensembles.',
    introducedIn: LESSON,
    aliases: ['ensemble model'],
  },
  {
    id: 'bootstrap-sample',
    term: 'Bootstrap sample',
    short:
      'A sample of n rows drawn with replacement from n rows: some rows appear several times, others not at all (about 37 % on average).',
    long: 'The chance a given row is never drawn in n draws is (1 − 1/n)ⁿ, which approaches 1/e ≈ 0.368 as n grows. The rows left out are called out-of-bag.',
    introducedIn: LESSON,
    aliases: ['bootstrap', 'sampling with replacement', 'out-of-bag'],
  },
  {
    id: 'bagging',
    term: 'Bagging',
    short:
      'Bootstrap aggregating: train the same kind of model on many bootstrap samples and combine their predictions (vote or average).',
    long: 'Each model sees slightly different data, so their mistakes differ; averaging them cancels part of the noise. It helps most for high-variance models such as deep decision trees.',
    introducedIn: LESSON,
    aliases: ['bootstrap aggregating'],
  },
  {
    id: 'random-forest',
    term: 'Random forest',
    short:
      'Bagging of decision trees with one more source of randomness: each split only considers a random subset of the features.',
    long: 'The random feature choice makes the trees less alike, so their combined vote is more reliable than any single tree. scikit-learn’s RandomForestClassifier averages the trees’ class probabilities rather than counting hard votes.',
    introducedIn: LESSON,
    aliases: ['forest', 'RandomForestClassifier'],
  },
  {
    id: 'gradient-boosting',
    term: 'Gradient boosting',
    short:
      'An ensemble built one small tree at a time: each new tree is fit to the errors (residuals) the current model still makes, and added in with a learning rate.',
    long: 'For squared error, the residuals y − F(x) are the negative gradient of the loss with respect to the predictions, so each stage is a gradient descent step taken in the space of functions. scikit-learn provides GradientBoostingClassifier/Regressor and the faster HistGradientBoostingClassifier/Regressor.',
    introducedIn: LESSON,
    aliases: ['boosting', 'GBM', 'gradient boosted trees'],
  },
] satisfies GlossaryTerm[];

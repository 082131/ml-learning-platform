import type { LessonMeta } from '@/lib/types';

const SK = 'https://scikit-learn.org/stable/modules';

export default {
  id: 'ml/classical/trees-ensembles',
  title: 'Decision trees, random forests and gradient boosting',
  level: 'intermediate',
  minutes: 60,
  kind: 'lesson',
  objectives: [
    'Compute the Gini impurity of a node and the weighted Gini of a split by hand',
    'Find the best split of a feature by trying every midpoint threshold, and grow a small tree greedily',
    'Explain how bootstrap samples and random feature choice make a random forest’s vote better than one tree',
    'Explain how gradient boosting fits each new tree to the residuals and why the learning rate matters',
    'Train and read DecisionTreeClassifier, RandomForestClassifier and GradientBoostingRegressor in scikit-learn',
  ],
  prerequisites: ['ml/classical/logistic-regression'],
  concepts: [
    'decision-tree',
    'gini-impurity',
    'split-threshold',
    'ensemble',
    'bootstrap-sample',
    'bagging',
    'random-forest',
    'gradient-boosting',
    'learning-rate',
    'mean-squared-error',
    'random-seed',
  ],
  references: [
    { title: 'Decision Trees (user guide)', url: `${SK}/tree.html`, version: 'scikit-learn 1.8' },
    {
      title: 'scikit-learn DecisionTreeClassifier (sklearn.tree)',
      url: `${SK}/generated/sklearn.tree.DecisionTreeClassifier.html`,
      version: 'scikit-learn 1.8',
    },
    {
      title: 'scikit-learn export_text (sklearn.tree)',
      url: `${SK}/generated/sklearn.tree.export_text.html`,
      version: 'scikit-learn 1.8',
    },
    {
      title: 'Ensembles: gradient boosting, random forests, bagging (user guide)',
      url: `${SK}/ensemble.html`,
      version: 'scikit-learn 1.8',
    },
    {
      title: 'scikit-learn RandomForestClassifier (sklearn.ensemble)',
      url: `${SK}/generated/sklearn.ensemble.RandomForestClassifier.html`,
      version: 'scikit-learn 1.8',
    },
    {
      title: 'scikit-learn GradientBoostingRegressor (sklearn.ensemble)',
      url: `${SK}/generated/sklearn.ensemble.GradientBoostingRegressor.html`,
      version: 'scikit-learn 1.8',
    },
    {
      title: 'scikit-learn HistGradientBoostingClassifier (sklearn.ensemble)',
      url: `${SK}/generated/sklearn.ensemble.HistGradientBoostingClassifier.html`,
      version: 'scikit-learn 1.8',
    },
    {
      title: 'Breiman (2001), Random Forests. Machine Learning 45, 5–32',
      url: 'https://doi.org/10.1023/A:1010933404324',
    },
    {
      title:
        'Friedman (2001), Greedy function approximation: a gradient boosting machine. Annals of Statistics 29(5)',
      url: 'https://doi.org/10.1214/aos/1013203451',
    },
    {
      title: 'Palmer penguins data (Horst, Hill and Gorman 2020), CC0',
      url: 'https://allisonhorst.github.io/palmerpenguins/',
    },
  ],
} satisfies LessonMeta;

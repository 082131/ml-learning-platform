// Code for ml/classical/splits-leakage. Every expected output below was copied from a real run with
// CPython 3.13, NumPy 2.4.6 and scikit-learn 1.8.0 (the versions Pyodide 314.0.7 ships). Those packages
// could not be loaded in Pyodide in the build container, so the browser shows these outputs as "not run yet".
import { splitsExperiment, type SplitState } from '@/lib/classical/splitsExperiment';
import { splitCounts } from '@/lib/classical/splits';
import { NOISE_ROWS } from '@/lib/classical/leakage';
import type { CodeExample } from '@/lib/types';

/** One state for the lesson: the split bar, the leakage scores, the split code and the readout read it. */
export const experiment = splitsExperiment('splits-leakage');

const counts = (s: unknown) => {
  const st = s as SplitState;
  return splitCounts(NOISE_ROWS, st.validationPct, st.testPct);
};

/** The split sizes in scikit-learn. Its counts equal the experiment's (tested); its shuffled rows differ. */
export const splitCode: CodeExample = {
  id: 'splits-sklearn',
  language: 'python',
  source: `import numpy as np
from sklearn.model_selection import train_test_split

rows = np.arange(60)  # row numbers 0..59 stand in for the 60 rows
train_val, test = train_test_split(rows, test_size={{nTest}}, random_state={{seed}})
train, val = train_test_split(train_val, test_size={{nVal}}, random_state={{seed}})
print(len(train), len(val), len(test))`,
  slots: {
    nTest: (s) => String(counts(s).test),
    nVal: (s) => String(counts(s).validation),
    seed: (s) => String((s as SplitState).seed),
  },
  annotations: [
    {
      id: 'import',
      range: { line: 2 },
      kind: 'syntax',
      title: 'from sklearn.model_selection import train_test_split',
      what: 'Loads scikit-learn’s function for splitting arrays into random train and test parts.',
      why: 'It shuffles and splits in one call, and keeps X and y rows aligned when you pass both.',
    },
    {
      id: 'rows',
      range: { line: 4, startCol: 0, endCol: 4 },
      match: 'rows',
      kind: 'variable',
      title: 'rows',
      what: 'The row numbers 0 to 59, one per row of the dataset.',
      why: 'Splitting row numbers instead of the data shows which rows land where. With real data you pass X and y.',
      output: 'shape (60,)',
    },
    {
      id: 'arange',
      range: { line: 4, startCol: 7, endCol: 20 },
      match: 'np.arange(60)',
      kind: 'framework',
      title: 'np.arange(60)',
      what: 'An array of the whole numbers 0, 1, …, 59.',
      why: 'A stand-in for 60 rows.',
    },
    {
      id: 'train-val',
      range: { line: 5, startCol: 0, endCol: 9 },
      match: 'train_val',
      kind: 'variable',
      title: 'train_val',
      what: 'The rows that are not test rows. They are split again on the next line.',
      why: 'train_test_split makes two parts per call, so three splits take two calls.',
    },
    {
      id: 'test',
      range: { line: 5, startCol: 11, endCol: 15 },
      match: 'test',
      kind: 'variable',
      title: 'test',
      what: 'The test rows, set aside first so that nothing later can touch them.',
      why: 'The test score is only an honest estimate if no decision was made by looking at these rows.',
    },
    {
      id: 'tts',
      range: { line: 5, startCol: 18, endCol: 34 },
      match: 'train_test_split',
      kind: 'function',
      title: 'train_test_split(...)',
      what: 'Shuffles the rows, then cuts them into two parts.',
      why: 'Shuffling first matters when the file is sorted (penguins.csv lists all Adelie penguins first).',
      inputs: 'One or more arrays with the same number of rows',
      output: 'For each input array: its train part, then its test part',
    },
    {
      id: 'test-size',
      range: { line: 5, startCol: 41, endCol: 60 },
      match: 'test_size={{nTest}}',
      kind: 'parameter',
      title: 'test_size',
      what: 'How many rows go to the second part. A whole number means rows; a float such as 0.3 means a share.',
      why: 'Filled from the Test share slider: the share times 60 rows.',
    },
    {
      id: 'random-state',
      range: { line: 5, startCol: 62, endCol: 83 },
      match: 'random_state={{seed}}',
      kind: 'parameter',
      title: 'random_state',
      what: 'The seed of the shuffle. The same seed gives the same split every run.',
      why: 'Without it each run gets a different split and different scores, which makes results hard to compare. scikit-learn shuffles with NumPy’s generator, so its rows differ from the bar above even for the same seed; the counts are the same.',
    },
    {
      id: 'second-split',
      range: { line: 6, startCol: 41, endCol: 59 },
      match: 'test_size={{nVal}}',
      kind: 'parameter',
      title: 'test_size (second call)',
      what: 'How many of the remaining rows become validation rows.',
      why: 'Filled from the Validation share slider. Giving a row count avoids rounding surprises when a share is taken of the already reduced train_val.',
    },
    {
      id: 'print',
      range: { line: 7 },
      kind: 'function',
      title: 'print(len(train), len(val), len(test))',
      what: 'Prints the number of rows in each split.',
      why: 'The readout below shows what this prints for the current sliders.',
    },
  ],
  expectedOutput: '33 9 18',
};

/** train_test_split on X and y together, stratified. Real output below. */
export const ttsExample: CodeExample = {
  id: 'splits-tts-stratify',
  language: 'python',
  source: `import numpy as np
from sklearn.model_selection import train_test_split

X = np.arange(20).reshape(10, 2)   # 10 rows, 2 features
y = np.array([0, 0, 0, 0, 0, 1, 1, 1, 1, 1])

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.3, random_state=0, stratify=y
)
print(X_train.shape, X_test.shape)
print(X_test)
print(y_test)`,
  annotations: [
    {
      id: 'unpack',
      range: { line: 7, startCol: 0, endCol: 32 },
      match: 'X_train, X_test, y_train, y_test',
      kind: 'variable',
      title: 'Four results',
      what: 'For each array passed in, its train part and then its test part: X_train, X_test, y_train, y_test.',
      why: 'X and y are shuffled with the same permutation, so row i of X_test still belongs with y_test[i].',
      output: 'X_train (7, 2), X_test (3, 2), y_train (7,), y_test (3,)',
    },
    {
      id: 'size',
      range: { line: 8, startCol: 10, endCol: 23 },
      match: 'test_size=0.3',
      kind: 'parameter',
      title: 'test_size=0.3',
      what: 'A share: 30% of 10 rows is 3 test rows.',
      why: 'scikit-learn rounds the test count up and gives training the rest.',
    },
    {
      id: 'seed',
      range: { line: 8, startCol: 25, endCol: 39 },
      match: 'random_state=0',
      kind: 'parameter',
      title: 'random_state=0',
      what: 'Fixes the shuffle so the output below is reproducible.',
      why: 'Change it and different rows land in the test set.',
    },
    {
      id: 'stratify',
      range: { line: 8, startCol: 41, endCol: 51 },
      match: 'stratify=y',
      kind: 'parameter',
      title: 'stratify=y',
      what: 'Keeps the share of each label the same in both parts, as far as whole rows allow.',
      why: 'With few rows, a plain shuffle can put most of one class in the test set. Here half of the 10 labels are 1. Half of 3 test rows would be 1.5, so the test set gets one 1 and two 0s, and the training set the other four 1s and three 0s.',
    },
  ],
  expectedOutput: `(7, 2) (3, 2)
[[ 0  1]
 [ 6  7]
 [14 15]]
[0 0 1]`,
};

/** The leakage experiment in scikit-learn, on 50 noise datasets. Real output below. */
export const leakSklearn: CodeExample = {
  id: 'splits-leak-sklearn',
  language: 'python',
  source: `import numpy as np
from sklearn.feature_selection import SelectKBest, f_classif
from sklearn.model_selection import train_test_split
from sklearn.neighbors import NearestCentroid
from sklearn.pipeline import make_pipeline

leaky, honest = [], []
for seed in range(50):
    rng = np.random.default_rng(seed)
    X = rng.normal(size=(60, 300))           # pure noise: 60 rows, 300 features
    y = rng.permutation([0] * 30 + [1] * 30)  # random labels, half of each
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=18, random_state=seed)

    # Leak: the 10 features are chosen by looking at every row, test rows included
    chosen = SelectKBest(f_classif, k=10).fit(X, y).get_support()
    model = NearestCentroid().fit(X_tr[:, chosen], y_tr)
    leaky.append(model.score(X_te[:, chosen], y_te))

    # Honest: selection is a step of the model, fitted on the training rows only
    pipe = make_pipeline(SelectKBest(f_classif, k=10), NearestCentroid())
    honest.append(pipe.fit(X_tr, y_tr).score(X_te, y_te))

print(f"leaky : {np.mean(leaky):.3f}")
print(f"honest: {np.mean(honest):.3f}")`,
  annotations: [
    {
      id: 'split',
      range: { line: 12, startCol: 52, endCol: 64 },
      match: 'test_size=18',
      kind: 'parameter',
      title: 'test_size=18',
      what: '18 of the 60 rows are test rows, as in the experiment’s starting state.',
      why: 'Same sizes, different random numbers: NumPy’s generator, not the lesson’s.',
    },
    {
      id: 'leaky-fit',
      range: { line: 15, startCol: 13, endCol: 51 },
      match: 'SelectKBest(f_classif, k=10).fit(X, y)',
      kind: 'framework',
      title: 'SelectKBest(...).fit(X, y): the leak',
      what: 'Scores every feature against the labels of all 60 rows and keeps the 10 best.',
      why: 'X and y include the test rows, so the chosen features are the ones that happen to fit the test labels too. With two classes, the f_classif score ranks features in the same order as |correlation with the label|.',
    },
    {
      id: 'centroid',
      range: { line: 16, startCol: 12, endCol: 33 },
      match: 'NearestCentroid().fit',
      kind: 'framework',
      title: 'NearestCentroid().fit(...)',
      what: 'Computes the mean of each class on the training rows; a new row gets the class whose mean is closest.',
      why: 'The model itself is fitted on training rows only. The leak happened one step earlier.',
    },
    {
      id: 'pipeline',
      range: { line: 20, startCol: 11, endCol: 24 },
      match: 'make_pipeline',
      kind: 'framework',
      title: 'make_pipeline(...)',
      what: 'Chains steps into one model: fitting the pipeline fits each step in turn on the data it is given.',
      why: 'Feature selection becomes part of the model, so it can only ever see the rows the model is fitted on.',
    },
    {
      id: 'pipe-fit',
      range: { line: 21, startCol: 18, endCol: 38 },
      match: 'pipe.fit(X_tr, y_tr)',
      kind: 'framework',
      title: 'pipe.fit(X_tr, y_tr)',
      what: 'Selects features and fits the centroids using the training rows only.',
      why: 'The test rows are used once, by score, after every choice has been made.',
    },
  ],
  expectedOutput: `leaky : 0.818
honest: 0.469`,
};

/** A scaler fitted on all rows vs on training rows, with real penguin flipper lengths. */
export const scalerLeak: CodeExample = {
  id: 'splits-scaler-leak',
  language: 'python',
  source: `import numpy as np
from sklearn.preprocessing import StandardScaler

# flipper_length_mm of penguins.csv rows 0, 1, 2, 4, 5, 6 (train) and 152, 153 (test)
train = np.array([[181.0], [186.0], [195.0], [193.0], [190.0], [181.0]])
test = np.array([[211.0], [230.0]])

leaky = StandardScaler().fit(np.vstack([train, test]))   # sees the test rows
honest = StandardScaler().fit(train)                     # training rows only
print("leaky mean :", leaky.mean_)
print("honest mean:", honest.mean_)
print("test, leaky :", leaky.transform(test).ravel().round(2))
print("test, honest:", honest.transform(test).ravel().round(2))`,
  annotations: [
    {
      id: 'leaky',
      range: { line: 8, startCol: 25, endCol: 54 },
      match: 'fit(np.vstack([train, test]))',
      kind: 'framework',
      title: 'fit on train and test together',
      what: 'Learns the mean and standard deviation from all 8 rows, the 2 test rows included.',
      why: 'This is the leak: the scaler now knows the test rows exist and are large, so they no longer look unusual after scaling.',
    },
    {
      id: 'honest',
      range: { line: 9, startCol: 26, endCol: 36 },
      match: 'fit(train)',
      kind: 'framework',
      title: 'fit(train)',
      what: 'Learns the mean (187.67) and standard deviation from the 6 training rows only.',
      why: 'Test rows are then transformed with numbers they did not influence, exactly as future data will be.',
    },
  ],
  expectedOutput: `leaky mean : [195.875]
honest mean: [187.66666667]
test, leaky : [0.96 2.17]
test, honest: [4.27 7.74]`,
};

// Code for ml/classical/fit-regularization. Outputs were copied from real runs with CPython 3.13,
// NumPy 2.4.6 and scikit-learn 1.8.0 (the versions Pyodide 314.0.7 ships); the NumPy printout is also
// checked against the TypeScript fit for several degrees and λ in src/lib/classical/polyRidge.test.ts.
// NumPy could not be loaded in Pyodide in the build container, so the browser shows these outputs as
// "not run yet".
import { fitExperiment, pythonFitData, pythonLambda, type FitState } from '@/lib/classical/fitExperiment';
import type { CodeExample } from '@/lib/types';

/** One state for the lesson: the fit plot, both error curves, the code and the readout read it. */
export const experiment = fitExperiment('fit-regularization');

const st = (s: unknown) => s as FitState;

export const ridgeNumpy: CodeExample = {
  id: 'fit-ridge-numpy',
  language: 'python',
  source: `import numpy as np

# 20 training and 20 validation points: y = sin(2πx) + noise, rounded to 3 decimals
${pythonFitData()}

degree = {{degree}}
lam = {{lam}}

def design(x, degree):
    t = 2 * x - 1                                     # map [0, 1] to [-1, 1]
    return np.vander(t, degree + 1, increasing=True)  # columns 1, t, t², …

X = design(x_train, degree)
penalty = np.eye(degree + 1)
penalty[0, 0] = 0                                     # the intercept is not penalized
w = np.linalg.solve(X.T @ X + lam * penalty, X.T @ y_train)

mse_train = np.mean((X @ w - y_train) ** 2)
mse_val = np.mean((design(x_val, degree) @ w - y_val) ** 2)
print(f"train MSE {mse_train:.4f}, validation MSE {mse_val:.4f}")`,
  slots: {
    degree: (s) => String(st(s).degree),
    lam: (s) => pythonLambda(st(s).logLambda),
  },
  annotations: [
    {
      id: 'data',
      range: { line: 4, startCol: 0, endCol: 7 },
      match: 'x_train',
      kind: 'variable',
      title: 'x_train, y_train, x_val, y_val',
      what: 'The 40 points of the plot: 20 to fit the curve, 20 to judge it. Each y is sin(2πx) plus Gaussian noise with standard deviation 0.3.',
      why: 'Synthetic data: because we know the true curve, we can tell a good fit from a lucky one.',
      output: 'Four arrays of shape (20,)',
    },
    {
      id: 'degree',
      range: { line: 13, startCol: 9, endCol: 19 },
      match: '{{degree}}',
      kind: 'parameter',
      title: 'degree',
      what: 'The highest power of t in the polynomial. Degree d has d + 1 weights.',
      why: 'Filled from the degree slider. More degree, more flexible curve.',
    },
    {
      id: 'lam',
      range: { line: 14, startCol: 6, endCol: 13 },
      match: '{{lam}}',
      kind: 'parameter',
      title: 'lam (λ)',
      what: 'The strength of the penalty on large weights, written as a power of ten.',
      why: 'Filled from the λ slider. Its useful values span many orders of magnitude, so the slider moves log₁₀ λ. lambda is a Python keyword, hence the name lam.',
    },
    {
      id: 't',
      range: { line: 17, startCol: 8, endCol: 17 },
      match: '2 * x - 1',
      kind: 'math',
      title: 't = 2x − 1',
      what: 'Maps x from [0, 1] to t in [−1, 1].',
      why: 'Powers of numbers in [0, 1] all shrink toward 0 and look alike (x¹¹ and x¹² are nearly equal), which makes the system nearly singular. On [−1, 1] the columns differ more and the solve stays accurate up to degree 12.',
    },
    {
      id: 'vander',
      range: { line: 18, startCol: 11, endCol: 52 },
      match: 'np.vander(t, degree + 1, increasing=True)',
      kind: 'framework',
      title: 'np.vander(t, degree + 1, increasing=True)',
      what: 'Builds the matrix whose columns are t⁰ = 1, t¹, t², …, t^degree.',
      why: 'A polynomial is a linear model in these columns, so the linear regression formula applies unchanged.',
      inputs: 't: shape (n,)',
      output: 'shape (n, degree + 1)',
    },
    {
      id: 'X',
      range: { line: 20, startCol: 4, endCol: 27 },
      match: 'design(x_train, degree)',
      kind: 'function',
      title: 'X = design(x_train, degree)',
      what: 'The design matrix of the training points.',
      why: 'Only training points go into the fit.',
      output: 'shape (20, degree + 1)',
    },
    {
      id: 'eye',
      range: { line: 21, startCol: 10, endCol: 28 },
      match: 'np.eye(degree + 1)',
      kind: 'framework',
      title: 'np.eye(degree + 1)',
      what: 'The identity matrix I of size degree + 1. The next line sets its top-left entry to 0.',
      why: 'λ·I adds λ to each weight’s diagonal entry. Zeroing the intercept’s entry leaves the curve free to move up and down, as scikit-learn’s Ridge does.',
    },
    {
      id: 'solve',
      range: { line: 23, startCol: 4, endCol: 19 },
      match: 'np.linalg.solve',
      kind: 'framework',
      title: 'np.linalg.solve(A, b)',
      what: 'Solves the linear system A w = b for w.',
      why: 'Solving is faster and more accurate than computing the inverse of A and multiplying.',
      output: 'w: shape (degree + 1,)',
    },
    {
      id: 'A',
      range: { line: 23, startCol: 20, endCol: 43 },
      match: 'X.T @ X + lam * penalty',
      kind: 'math',
      title: 'XᵀX + λP',
      what: 'The normal-equation matrix of least squares plus the penalty.',
      why: 'Adding λ to the diagonal makes the matrix better conditioned and pulls the weights toward 0.',
      output: 'shape (degree + 1, degree + 1)',
    },
    {
      id: 'b',
      range: { line: 23, startCol: 45, endCol: 58 },
      match: 'X.T @ y_train',
      kind: 'math',
      title: 'Xᵀy',
      what: 'How strongly each column lines up with the targets.',
      why: 'The right-hand side of the normal equations.',
      output: 'shape (degree + 1,)',
    },
    {
      id: 'mse',
      range: { line: 25, startCol: 12, endCol: 43 },
      match: 'np.mean((X @ w - y_train) ** 2)',
      kind: 'math',
      title: 'Training MSE',
      what: 'The mean of the squared differences between the fitted curve and the training targets.',
      why: 'How well the curve fits the points it was fitted to.',
    },
    {
      id: 'val',
      range: { line: 26, startCol: 19, endCol: 44 },
      match: 'design(x_val, degree) @ w',
      kind: 'math',
      title: 'Predictions at the validation x',
      what: 'The same weights evaluated at the 20 validation x values.',
      why: 'The validation MSE estimates the error on new points. The weights never saw these points.',
    },
  ],
  expectedOutput: 'train MSE 0.0682, validation MSE 0.0656',
};

/** The same model with scikit-learn's Ridge, for degree 12 and λ = 10^−2.5. Real output below. */
export const ridgeSklearn: CodeExample = {
  id: 'fit-ridge-sklearn',
  language: 'python',
  source: `import numpy as np
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_squared_error
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import FunctionTransformer, PolynomialFeatures

${pythonFitData()}

model = make_pipeline(
    FunctionTransformer(lambda x: 2 * x - 1),          # map [0, 1] to [-1, 1]
    PolynomialFeatures(degree=12, include_bias=False),  # t, t², …, t¹²
    Ridge(alpha=10 ** -2.5),                            # alpha is λ; the intercept is not penalized
)
model.fit(x_train.reshape(-1, 1), y_train)
print(f"train MSE {mean_squared_error(y_train, model.predict(x_train.reshape(-1, 1))):.4f}")
print(f"validation MSE {mean_squared_error(y_val, model.predict(x_val.reshape(-1, 1))):.4f}")`,
  annotations: [
    {
      id: 'ft',
      range: { line: 17, startCol: 4, endCol: 23 },
      match: 'FunctionTransformer',
      kind: 'framework',
      title: 'FunctionTransformer(lambda x: 2 * x - 1)',
      what: 'A pipeline step that applies a function to the input: here the map from [0, 1] to [−1, 1].',
      why: 'Same input scaling as the NumPy code, so the fitted curves are the same.',
    },
    {
      id: 'poly',
      range: { line: 18, startCol: 4, endCol: 53 },
      match: 'PolynomialFeatures(degree=12, include_bias=False)',
      kind: 'framework',
      title: 'PolynomialFeatures(degree=12, include_bias=False)',
      what: 'Turns the column t into the columns t, t², …, t¹².',
      why: 'include_bias=False leaves out the column of ones: Ridge fits its own intercept.',
      output: 'shape (n, 12)',
    },
    {
      id: 'ridge',
      range: { line: 19, startCol: 4, endCol: 27 },
      match: 'Ridge(alpha=10 ** -2.5)',
      kind: 'framework',
      title: 'Ridge(alpha=...)',
      what: 'Linear regression with the penalty alpha · Σ wⱼ² added to the sum of squared errors. The intercept is fitted but not penalized.',
      why: 'alpha is the λ of the formula, with the same scale (a sum, not a mean, of squared errors), so the scores equal the NumPy code’s at degree 12, log₁₀ λ = −2.5.',
    },
    {
      id: 'reshape',
      range: { line: 21, startCol: 10, endCol: 32 },
      match: 'x_train.reshape(-1, 1)',
      kind: 'framework',
      title: 'x_train.reshape(-1, 1)',
      what: 'Turns shape (20,) into (20, 1): 20 rows, one feature column.',
      why: 'scikit-learn always expects X as a 2-D table, even with one feature.',
    },
    {
      id: 'msefn',
      range: { line: 22, startCol: 19, endCol: 37 },
      match: 'mean_squared_error',
      kind: 'framework',
      title: 'mean_squared_error(y_true, y_pred)',
      what: 'The mean of the squared differences, the same number as np.mean((pred - y) ** 2).',
      why: 'Saves writing the formula by hand.',
    },
  ],
  expectedOutput: `train MSE 0.0513
validation MSE 0.1833`,
};

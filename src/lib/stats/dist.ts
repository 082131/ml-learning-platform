/**
 * Probability distributions for the Statistics and probability track (T.11). Pure functions; every value is checked
 * against SciPy 1.18.1 in stats.test.ts. Accuracy is about 1e-9 for the normal and 1e-10 for the gamma/beta family,
 * far more than the four decimals the lessons display.
 */

const SQRT2PI = Math.sqrt(2 * Math.PI);

/** Natural log of the gamma function (Lanczos, g = 7, n = 9). Γ(n) = (n − 1)! for whole numbers. */
export function logGamma(x: number): number {
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - logGamma(1 - x);
  const z = x - 1;
  let a = c[0]!;
  const t = z + 7.5;
  for (let i = 1; i < 9; i++) a += c[i]! / (z + i);
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a);
}

/** log of n choose k. */
export const logChoose = (n: number, k: number) => logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1);

/** P(X = k) for X ~ Binomial(n, p): the chance of exactly k successes in n independent tries. */
export function binomPmf(k: number, n: number, p: number): number {
  if (k < 0 || k > n || !Number.isInteger(k)) return 0;
  if (p === 0) return k === 0 ? 1 : 0;
  if (p === 1) return k === n ? 1 : 0;
  return Math.exp(logChoose(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p));
}

/** P(X ≤ k) for a binomial. */
export function binomCdf(k: number, n: number, p: number): number {
  let s = 0;
  for (let i = 0; i <= Math.min(k, n); i++) s += binomPmf(i, n, p);
  return Math.min(1, s);
}

/** P(X = k) for X ~ Poisson(λ): the chance of exactly k events when λ happen on average. */
export function poissonPmf(k: number, lambda: number): number {
  if (k < 0 || !Number.isInteger(k)) return 0;
  if (lambda === 0) return k === 0 ? 1 : 0;
  return Math.exp(k * Math.log(lambda) - lambda - logGamma(k + 1));
}

export function poissonCdf(k: number, lambda: number): number {
  let s = 0;
  for (let i = 0; i <= k; i++) s += poissonPmf(i, lambda);
  return Math.min(1, s);
}

/** The bell curve's height at x: a density, not a probability. */
export const normalPdf = (x: number, mu = 0, sigma = 1) => Math.exp(-0.5 * ((x - mu) / sigma) ** 2) / (sigma * SQRT2PI);

/** Complementary error function, by the Chebyshev expansion in Numerical Recipes (3rd ed., Erf). */
function erfc(x: number): number {
  // Chebyshev coefficients from Numerical Recipes 3rd ed. (Erf struct), accurate to about 1.2e-16 relative.
  const cof = [
    -1.3026537197817094, 6.4196979235649026e-1, 1.9476473204185836e-2, -9.561514786808631e-3, -9.46595344482036e-4,
    3.66839497852761e-4, 4.2523324806907e-5, -2.0278578112534e-5, -1.624290004647e-6, 1.30365583558e-6, 1.5626441722e-8,
    -8.5238095915e-8, 6.529054439e-9, 5.059343495e-9, -9.91364156e-10, -2.27365122e-10, 9.6467911e-11, 2.394038e-12,
    -6.886027e-12, 8.94487e-13, 3.13092e-13, -1.12708e-13, 3.81e-16, 7.106e-15, -1.523e-15, -9.4e-17, 1.21e-16, -2.8e-17,
  ];
  const erfccheb = (z: number) => {
    let d = 0;
    let dd = 0;
    const t = 2 / (2 + z);
    const ty = 4 * t - 2;
    for (let j = cof.length - 1; j > 0; j--) {
      const tmp = d;
      d = ty * d - dd + cof[j]!;
      dd = tmp;
    }
    return t * Math.exp(-z * z + 0.5 * (cof[0]! + ty * d) - dd);
  };
  return x >= 0 ? erfccheb(x) : 2 - erfccheb(-x);
}

/** P(Z ≤ z) for a normal: the area under the bell curve to the left of x. */
export const normalCdf = (x: number, mu = 0, sigma = 1) => 0.5 * erfc(-(x - mu) / (sigma * Math.SQRT2));

/** The z with P(Z ≤ z) = p (Acklam's approximation, refined by one Halley step). normalQuantile(0.975) ≈ 1.959964. */
export function normalQuantile(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const lo = 0.02425;
  let x: number;
  if (p < lo) {
    const q = Math.sqrt(-2 * Math.log(p));
    x = (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) / ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
  } else if (p <= 1 - lo) {
    const q = p - 0.5;
    const r = q * q;
    x = ((((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * q) / (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    x = -(((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) / ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
  }
  const e = normalCdf(x) - p;
  const u = e * SQRT2PI * Math.exp((x * x) / 2);
  return x - u / (1 + (x * u) / 2);
}

/** Continued fraction for the incomplete beta function (Numerical Recipes betacf). */
function betaContinuedFraction(a: number, b: number, x: number): number {
  const FPMIN = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-15) break;
  }
  return h;
}

/** The regularized incomplete beta I_x(a, b): P(X ≤ x) for X ~ Beta(a, b). */
export function betaCdf(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? (front * betaContinuedFraction(a, b, x)) / a : 1 - (front * betaContinuedFraction(b, a, 1 - x)) / b;
}

/** Height of the Beta(a, b) density at x, the shape of our belief about a rate between 0 and 1. */
export function betaPdf(x: number, a: number, b: number): number {
  if (x < 0 || x > 1) return 0;
  if ((x === 0 && a < 1) || (x === 1 && b < 1)) return Infinity;
  if ((x === 0 && a > 1) || (x === 1 && b > 1)) return 0;
  return Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) + logGamma(a + b) - logGamma(a) - logGamma(b));
}

/** The x with P(X ≤ x) = p for Beta(a, b), by bisection (used for credible intervals). */
export function betaQuantile(p: number, a: number, b: number): number {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (betaCdf(mid, a, b) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** P(T ≤ t) for Student's t with df degrees of freedom. */
export function tCdf(t: number, df: number): number {
  const x = df / (df + t * t);
  const tail = 0.5 * betaCdf(x, df / 2, 0.5);
  return t >= 0 ? 1 - tail : tail;
}

export const tPdf = (t: number, df: number) =>
  Math.exp(logGamma((df + 1) / 2) - logGamma(df / 2) - 0.5 * Math.log(df * Math.PI) - ((df + 1) / 2) * Math.log(1 + (t * t) / df));

/** The t with P(T ≤ t) = p. tQuantile(0.975, 9) ≈ 2.262. */
export function tQuantile(p: number, df: number): number {
  let lo = -100;
  let hi = 100;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (tCdf(mid, df) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * P(rate of B > rate of A) when A ~ Beta(a1, b1) and B ~ Beta(a2, b2) are independent: ∫ f_B(x) · F_A(x) dx,
 * integrated with Simpson's rule on a grid that covers both distributions.
 */
export function probBetaGreater(a1: number, b1: number, a2: number, b2: number, steps = 4000): number {
  const lo = Math.max(0, Math.min(betaQuantile(1e-9, a1, b1), betaQuantile(1e-9, a2, b2)));
  const hi = Math.min(1, Math.max(betaQuantile(1 - 1e-9, a1, b1), betaQuantile(1 - 1e-9, a2, b2)));
  const h = (hi - lo) / steps;
  let s = 0;
  for (let i = 0; i <= steps; i++) {
    const x = lo + i * h;
    const w = i === 0 || i === steps ? 1 : i % 2 ? 4 : 2;
    const f = betaPdf(x, a2, b2);
    s += w * (Number.isFinite(f) ? f : 0) * betaCdf(x, a1, b1);
  }
  return Math.min(1, Math.max(0, (s * h) / 3));
}

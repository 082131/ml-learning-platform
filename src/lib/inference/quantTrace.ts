import type { Trace, TraceStep } from '../types';
import { array, scalar, text } from '../trace/values';
import { roundHalfEven } from './floatBits';

/** Symmetric quantization of a short list in plain Python. Python's round() rounds half to even. */
export const QUANT_BY_HAND_SOURCE = `w = [0.31, -1.27, 0.057, 0.894, -0.402]
bits = 8
qmax = 2 ** (bits - 1) - 1
scale = max(abs(x) for x in w) / qmax
q = [round(x / scale) for x in w]
w_hat = [v * scale for v in q]
errors = [a - b for a, b in zip(w_hat, w)]
print(q)
print([round(v, 6) for v in w_hat])
print([round(e, 6) for e in errors])`;

export const QUANT_BY_HAND_W = [0.31, -1.27, 0.057, 0.894, -0.402];
const round6 = (x: number) => roundHalfEven(x * 1e6) / 1e6;
const pyFloat = (x: number) => (Object.is(x, -0) ? '-0.0' : Number.isInteger(x) ? `${x}.0` : String(x));
const pyList = (xs: number[], float = true) =>
  `[${xs.map((x) => (float ? pyFloat(x) : String(x))).join(', ')}]`;

/** A computed trace of QUANT_BY_HAND_SOURCE for `w`, with each element's arithmetic in the notes. */
export function buildQuantTrace(w: number[], bits = 8): Trace {
  const steps: TraceStep[] = [];
  const vars: TraceStep['vars'] = {};
  const step = (line: number, note: string, set: TraceStep['vars'], highlight?: TraceStep['highlight']) => {
    Object.assign(vars, set);
    steps.push({ range: { line }, vars: { ...vars }, note, ...(highlight ? { highlight } : {}) });
  };
  step(1, `Five weights to quantize.`, { w: array(w) });
  step(2, `Store each as an 8-bit integer.`, { bits: scalar(bits) });
  const qmax = 2 ** (bits - 1) - 1;
  step(3, `Symmetric quantization uses −${qmax}…${qmax}: qmax = 2^${bits - 1} − 1 = ${qmax}.`, {
    qmax: scalar(qmax),
  });
  const maxAbs = Math.max(...w.map(Math.abs));
  const scale = maxAbs / qmax;
  const at = w.findIndex((x) => Math.abs(x) === maxAbs);
  step(
    4,
    `The largest |w| is ${maxAbs}, so scale = ${maxAbs} / ${qmax} = ${scale}. One integer step is worth ${scale}.`,
    { scale: scalar(scale) },
    { w: [[at]] },
  );
  const q = w.map((x) => roundHalfEven(x / scale));
  q.forEach((v, i) =>
    step(
      5,
      `w[${i}] / scale = ${w[i]} / ${scale} = ${Number((w[i]! / scale).toFixed(6))}, which rounds to ${v}.`,
      { q: array(q.slice(0, i + 1)) },
      { w: [[i]] },
    ),
  );
  const wHat = q.map((v) => v * scale);
  step(
    6,
    `Dequantize: multiply each integer by the scale, for example ${q[2]} × ${scale} = ${round6(wHat[2]!)}.`,
    { w_hat: array(wHat.map(round6)) },
  );
  const errors = wHat.map((v, i) => v - w[i]!);
  step(7, `The error is what rounding lost: at most half a step, ${scale / 2}, in size.`, {
    errors: array(errors.map(round6)),
  });
  const out = [pyList(q, false), pyList(wHat.map(round6)), pyList(errors.map(round6))];
  out.forEach((line, i) => step(8 + i, `Prints ${line}.`, { output: text(out.slice(0, i + 1).join('\n')) }));
  return { source: 'computed', steps };
}

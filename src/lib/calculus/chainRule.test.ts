import { describe, expect, it } from 'vitest';
import { fillSlots } from '../code/slots';
import { validateTrace } from '../code/validate';
import { validateExperiment } from '../experiment';
import REAL from './fixtures/chain-prints.json';
import {
  buildChainTrace,
  CHAIN_SOURCE,
  chainGraph,
  describeGradient,
  chainRuleExperiment,
  chainSlots,
  forwardBackward,
  printLine,
  type ChainState,
} from './chainRule';

const start: ChainState = { w: 1, x: 2, b: 0, y: 6, selected: 'w' };

describe('chain rule on L = (w·x + b − y)²', () => {
  it('hand-worked: w = 1, x = 2, b = 0, y = 6', () => {
    const { value, grad } = forwardBackward(start);
    // ŷ = 2, e = −4, L = 16; ∂L/∂e = −8, ∂L/∂w = −8·2 = −16, ∂L/∂b = −8
    expect([value.yhat.v, value.e.v, value.L.v]).toEqual([2, -4, 16]);
    expect([grad.e!.v, grad.w!.v, grad.b!.v]).toEqual([-8, -16, -8]);
  });

  it('agrees with a central difference', () => {
    const s = { w: -1.5, x: 2.5, b: -0.5, y: 1 };
    const loss = (w: number, b: number) => (w * s.x + b - s.y) ** 2;
    const h = 1e-6;
    const { grad } = forwardBackward(s);
    expect(grad.w!.v).toBeCloseTo((loss(s.w + h, s.b) - loss(s.w - h, s.b)) / (2 * h), 5);
    expect(grad.b!.v).toBeCloseTo((loss(s.w, s.b + h) - loss(s.w, s.b - h)) / (2 * h), 5);
  });

  // fixtures/chain-prints.json: the lesson's code run by CPython 3.13 (ints and floats as Python keeps them).
  it.each(REAL as [number[], string][])('inputs %j print %s', ([w, x, b, y], out) => {
    expect(printLine({ w: w!, x: x!, b: b!, y: y! })).toBe(out);
  });

  it('builds a valid trace of the filled source, ending with the printed line', () => {
    const trace = buildChainTrace(start);
    const { source } = fillSlots(CHAIN_SOURCE, [], { values: chainSlots.values(start) });
    expect(source.split('\n')[0]).toBe('w, x, b, y = 1, 2, 0, 6');
    expect(validateTrace(trace, source)).toEqual([]);
    expect(trace.steps.at(-1)!.vars.output).toEqual({ kind: 'text', value: '16 -16 -8' });
    expect(trace.steps.map((st) => st.range.line)).toEqual([1, 4, 5, 6, 7, 10, 11, 12, 13, 14, 15]);
  });

  it('is a valid experiment', () => expect(validateExperiment(chainRuleExperiment('t', start))).toEqual([]));
});

describe('the computation graph', () => {
  const r = forwardBackward(start);
  it('labels nodes with values and gradients, edges with local derivatives', () => {
    const { nodes, edges } = chainGraph(r, 'w');
    expect(nodes.find((n) => n.id === 'e')).toMatchObject({ label: 'e = ŷ − y = -4', detail: '∂L/∂e = -8' });
    expect(nodes.map((n) => n.id)).toEqual(['w', 'p', 'yhat', 'b', 'e', 'L']);
    expect(edges.find((e) => e.from === 'e')!.label).toBe('∂L/∂e = 2e = -8');
    expect(edges.find((e) => e.from === 'p')!.label).toBe('∂ŷ/∂p = 1');
    expect(edges.filter((e) => e.active).map((e) => e.from)).toEqual(['w', 'p', 'yhat', 'e']);
  });
  it('writes the chain-rule product for a node', () => {
    expect(describeGradient(r, 'w')).toBe('∂L/∂w = ∂L/∂e · ∂e/∂ŷ · ∂ŷ/∂p · ∂p/∂w = (-8) · 1 · 1 · 2 = -16');
    expect(describeGradient(r, 'b')).toBe('∂L/∂b = ∂L/∂e · ∂e/∂ŷ · ∂ŷ/∂b = (-8) · 1 · 1 = -8');
    expect(describeGradient(r, 'y')).toMatch(/is data/);
  });
});

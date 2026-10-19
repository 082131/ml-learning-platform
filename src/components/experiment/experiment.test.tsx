import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { applyControl, cellError, experimentReducer, validateExperiment } from '@/lib/experiment';
import { scalar } from '@/lib/trace/values';
import type { CodeExample, ExperimentDef } from '@/lib/types';
import { StepThrough } from '@/components/code/StepThrough';
import { PlainCode } from '@/components/code/PlainCode';
import { useContext } from 'react';
import { SlotStateContext } from '@/components/code/slotState';
import { fillExample } from '@/lib/code/slots';
import { Experiment } from './Experiment';
import { useExperimentContext } from './ExperimentContext';
import { Readout } from './Readout';

interface S {
  n: number;
  m: number[][];
  mode: string;
}
const def: ExperimentDef<S, number> = {
  id: 'double',
  initial: { n: 3, m: [[1, 2]], mode: 'add' },
  controls: [
    { kind: 'slider', id: 'n', label: 'n', min: 0, max: 10, get: (s) => s.n, set: (s, n) => ({ ...s, n }) },
    {
      kind: 'matrix-cell',
      id: 'm',
      label: 'M',
      integer: true,
      min: -9,
      max: 9,
      get: (s) => s.m,
      set: (s, i, j, v) => ({ ...s, m: s.m.map((r, a) => r.map((x, b) => (a === i && b === j ? v : x))) }),
    },
    {
      kind: 'select',
      id: 'mode',
      label: 'Mode',
      options: [
        { value: 'add', label: 'Add' },
        { value: 'mul', label: 'Multiply' },
      ],
      get: (s) => s.mode,
      set: (s, mode) => ({ ...s, mode }),
    },
  ],
  compute: (s) => (s.mode === 'add' ? s.n + s.m[0]![0]! : s.n * s.m[0]![0]!),
  trace: (s) => ({
    source: 'computed',
    steps: [{ range: { line: 1 }, vars: { n: scalar(s.n) }, note: `n is ${s.n}.` }],
  }),
  traceExample: 'code',
  readout: (_s, r) => [{ label: 'result', value: String(r) }],
};

const code: CodeExample = {
  id: 'code',
  language: 'python',
  source: 'n = {{n}}',
  slots: { n: (s) => String((s as S).n) },
  annotations: [],
};

/** A stand-in visualization: reads (state, result) from the experiment. */
function Viz() {
  const { state, result } = useExperimentContext<S, number>('Viz');
  return <p data-testid="viz">{`viz n=${state.n} result=${result}`}</p>;
}
function Literal() {
  const { source } = fillExample(code, useContext(SlotStateContext));
  return <PlainCode source={source} language="python" label="literal" />;
}

function renderExperiment() {
  return render(
    <Experiment def={def}>
      <Viz />
      <Literal />
      <StepThrough example={code} />
      <Readout />
    </Experiment>,
  );
}

describe('experiment logic', () => {
  it('reduces updates and resets, and applies control values with clamping', () => {
    const s0 = def.initial;
    const s1 = experimentReducer(s0, { type: 'update', update: (s) => ({ ...s, n: 5 }) });
    expect(s1.n).toBe(5);
    expect(experimentReducer(s1, { type: 'reset', state: s0 })).toBe(s0);
    expect(applyControl(def.controls[0]!, s0, 99).n).toBe(10);
    expect(applyControl(def.controls[2]!, s0, 'mul').mode).toBe('mul');
    expect(() => applyControl(def.controls[2]!, s0, 'nope')).toThrow(/no option/);
  });

  it('explains invalid cell values', () => {
    expect(cellError({ integer: true }, '1.5')).toBe('Enter a whole number.');
    expect(cellError({ min: 0, max: 9 }, '12')).toBe('Enter a number from 0 to 9.');
    expect(cellError({}, 'x')).toBe('Enter a number.');
    expect(cellError({ integer: true, min: -9, max: 9 }, '-3')).toBeUndefined();
  });

  it('validates definitions', () => {
    expect(validateExperiment(def)).toEqual([]);
    const broken: ExperimentDef<S, number> = {
      ...def,
      initial: { ...def.initial, n: 20, mode: 'zzz' },
      controls: [...def.controls, def.controls[0]!],
    };
    expect(validateExperiment(broken)).toEqual([
      'experiment double: control "n" starts out of range',
      'experiment double: control "mode" starts on a value that is not an option',
      'experiment double: duplicate control id "n"',
      'experiment double: control "n" starts out of range',
    ]);
  });
});

describe('Experiment', () => {
  it('a slider change updates the visualization, the code literal, the trace and the readout together', () => {
    const { container } = renderExperiment();
    expect(screen.getByTestId('viz')).toHaveTextContent('viz n=3 result=4');
    fireEvent.change(screen.getByRole('slider', { name: 'n' }), { target: { value: '7' } });
    expect(screen.getByTestId('viz')).toHaveTextContent('viz n=7 result=8');
    expect(screen.getByRole('group', { name: 'literal' })).toHaveTextContent('n = 7');
    expect(container.querySelector('[data-step-through="code"]')).toHaveTextContent('n is 7.');
    expect(screen.getByRole('region', { name: 'Result' })).toHaveTextContent('result8');
  });

  it('edits matrix cells, rejects invalid input without changing state, and resets', async () => {
    const user = userEvent.setup();
    renderExperiment();
    const cell = screen.getByRole('textbox', { name: 'M[0][0]' });
    await user.clear(cell);
    await user.type(cell, '4');
    expect(screen.getByTestId('viz')).toHaveTextContent('result=7');
    await user.type(cell, '.5');
    expect(screen.getByRole('alert')).toHaveTextContent('M[0][0]: Enter a whole number.');
    expect(screen.getByTestId('viz')).toHaveTextContent('result=7');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Mode' }), 'mul');
    expect(screen.getByTestId('viz')).toHaveTextContent('result=12');
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByTestId('viz')).toHaveTextContent('viz n=3 result=4');
    expect(cell).toHaveValue('1');
  });

  it('a visualization outside an experiment fails with a clear message', () => {
    expect(() => render(<Viz />)).toThrow('<Viz> must be placed inside an <Experiment>');
  });
});

describe('shared experiment state', () => {
  it('blocks with the same experiment id on a lesson page share one state', async () => {
    const { createStoreRegistry } = await import('@/lib/experiment');
    const { ExperimentStoresContext } = await import('./useExperiment');
    render(
      <ExperimentStoresContext.Provider value={createStoreRegistry()}>
        <Experiment def={def} title="First">
          <Viz />
        </Experiment>
        <Experiment def={def} title="Second" controls={false}>
          <Readout />
        </Experiment>
      </ExperimentStoresContext.Provider>,
    );
    expect(screen.getAllByRole('slider', { name: 'n' })).toHaveLength(1);
    fireEvent.change(screen.getByRole('slider', { name: 'n' }), { target: { value: '9' } });
    expect(screen.getByRole('region', { name: 'Result' })).toHaveTextContent('result10');
  });

  it('refuses two different experiments with one id', async () => {
    const { createStoreRegistry } = await import('@/lib/experiment');
    const registry = createStoreRegistry();
    registry.get(def);
    expect(() => registry.get({ ...def, initial: { ...def.initial } })).toThrow(/Two different experiments/);
  });
});

describe('Readout overflow (thread 5)', () => {
  it('makes a value cell focusable only while its value overflows', () => {
    const proto = HTMLElement.prototype;
    const original = Object.getOwnPropertyDescriptor(proto, 'scrollWidth');
    let wide = 500;
    Object.defineProperty(proto, 'scrollWidth', { configurable: true, get: () => wide });
    try {
      const { rerender } = render(
        <Experiment def={def}>
          <Readout />
        </Experiment>,
      );
      const dd = screen.getByRole('region', { name: 'Result' }).querySelector('dd')!;
      expect(dd).toHaveAttribute('tabindex', '0');
      wide = 0;
      rerender(
        <Experiment def={def} title="Again">
          <Readout />
        </Experiment>,
      );
      expect(dd).not.toHaveAttribute('tabindex');
    } finally {
      if (original) Object.defineProperty(proto, 'scrollWidth', original);
      else delete (proto as { scrollWidth?: number }).scrollWidth;
    }
  });
});

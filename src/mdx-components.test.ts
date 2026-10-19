import { describe, expect, it } from 'vitest';
import { mdxComponents, mergeRegistry, vizComponents } from './mdx-components';

describe('mdx component registry', () => {
  it('includes the core components and every visualization folder’s mdx.ts', () => {
    expect(Object.keys(mdxComponents)).toEqual(
      expect.arrayContaining(['Section', 'Code', 'Experiment', 'Readout']),
    );
    expect(Object.keys(vizComponents).sort()).toEqual(
      expect.arrayContaining([
        'BarCompare',
        'FlowDiagram',
        'GradientDescent1D',
        'LineChart',
        'MatMulGrid',
        'VectorPlane',
      ]),
    );
  });

  it('refuses a name registered twice', () => {
    const C = () => null;
    expect(() => mergeRegistry({ Section: C }, { 'viz/X/mdx.ts': { Section: C } })).toThrow(
      'viz/X/mdx.ts: component name "Section" is already registered',
    );
    expect(() => mergeRegistry({}, { a: { X: C }, b: { X: C } })).toThrow(/"X" is already registered/);
  });
});

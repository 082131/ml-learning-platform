import { describe, expect, it } from 'vitest';
import { fillSlots } from '../code/slots';
import { validateTrace } from '../code/validate';
import { validateExperiment } from '../experiment';
import fixture from './fixtures/trees.json';
import { SPECIES } from './penguins';
import { treeLayout } from './treeLayout';
import {
  buildSplitSearchTrace,
  giniArithmetic,
  SPLIT_SEARCH_SOURCE,
  splitSearchOutput,
} from './splitSearchTrace';
import {
  BOOST_X,
  BOOST_Y,
  boostExperiment,
  boostPrintedMse,
  computeBoost,
  computeForest,
  computeSplit,
  exportText,
  featureValues,
  FOREST_TEST,
  FOREST_TRAIN,
  forestExperiment,
  splitExperiment,
  splitSlots,
  TOY,
  TREE_FEATURES,
  votesFromScratch,
  toyXLiteral,
  boostSlots,
} from './treesExperiments';

const TOY_Y = TOY.map((p) => SPECIES.indexOf(p.species));

describe('toy penguins', () => {
  it('are the 14 rows the Python examples inline', () => {
    expect(featureValues('bill_length_mm')).toEqual([
      41.1, 36.6, 38.7, 39, 38.1, 35.6, 46.1, 42.8, 48.4, 47.3, 43.2, 52.8, 47.5, 50.2,
    ]);
    expect(BOOST_X).toEqual([182, 185, 195, 186, 190, 191, 215, 209, 203, 216, 187, 205, 199, 202]);
    expect(BOOST_Y).toEqual([
      3200, 3700, 3450, 3550, 3700, 3175, 5100, 4700, 4625, 4725, 2900, 4550, 3900, 3800,
    ]);
    expect(TOY.map((p) => p.species)).toEqual([
      ...Array<string>(6).fill('Adelie'),
      ...Array<string>(4).fill('Gentoo'),
      ...Array<string>(4).fill('Chinstrap'),
    ]);
  });
});

describe('split experiment', () => {
  const def = splitExperiment('split');
  it('is valid', () => expect(validateExperiment(def)).toEqual([]));

  it('scores the initial candidate and finds the best split', () => {
    const r = computeSplit(def.initial);
    // candidate 4 of 13 on bill length: 38.85 → left 4 Adelie | right 2 Adelie, 4 Chinstrap, 4 Gentoo
    expect(r.current.threshold).toBeCloseTo(38.85, 12);
    expect(r.current.left).toEqual([4, 0, 0]);
    expect(r.current.right).toEqual([2, 4, 4]);
    // right: 1 − (4 + 16 + 16)/100 = 0.64; weighted 10/14 · 0.64 = 0.45714…
    expect(r.current.weighted).toBeCloseTo((10 / 14) * 0.64, 12);
    expect(r.scores[r.best]!.threshold).toBeCloseTo(41.95, 12);
    expect(r.trainAccuracy).toBeCloseTo(13 / 14, 12);
  });

  it('writes Gini out term by term', () => {
    expect(giniArithmetic([1, 4, 4])).toBe('1 − ((1/9)² + (4/9)² + (4/9)²) = 0.5926');
    expect(giniArithmetic([0, 0, 0])).toBe('0 (empty)');
  });

  it('prints export_text exactly as scikit-learn 1.8 does, for every depth', () => {
    for (const depth of [1, 2, 3]) {
      const text = exportText(computeSplit({ ...def.initial, depth }).tree, TREE_FEATURES, SPECIES);
      // print() adds a newline after export_text's own trailing one
      expect(`${text}\n`).toBe(fixture.export_text[String(depth) as '1' | '2' | '3']);
    }
  });

  it('prints what the Python split search printed in CPython 3.13', () => {
    // ~/pyenv/bin/python on SPLIT_SEARCH_SOURCE filled for each feature
    expect(splitSearchOutput(featureValues('bill_length_mm'), TOY_Y, 3)).toBe('41.95 0.2857');
    expect(splitSearchOutput(featureValues('flipper_length_mm'), TOY_Y, 3)).toBe('197.0 0.3673');
  });

  it('builds a valid computed trace against the filled source', () => {
    for (const feature of TREE_FEATURES) {
      const s = { ...def.initial, feature };
      const trace = buildSplitSearchTrace(featureValues(feature), TOY_Y, SPECIES);
      const { source } = fillSlots(SPLIT_SEARCH_SOURCE, [], { xs: splitSlots.xs(s), feature });
      expect(validateTrace(trace, source)).toEqual([]);
      expect(trace.source).toBe('computed');
    }
    const trace = buildSplitSearchTrace(featureValues('bill_length_mm'), TOY_Y, SPECIES);
    // 4 setup steps, 13 candidates × 2, 6 improvements (36.1, 37.35, 38.4, 38.85, 40.05, 41.95), print
    expect(trace.steps).toHaveLength(4 + 26 + 6 + 1);
    expect(trace.steps.at(-1)!.vars.output).toEqual({ kind: 'text', value: '41.95 0.2857' });
    const third = trace.steps.filter((st) => st.range.line === 16)[3]!;
    expect(third.note).toContain('10 go right, gini 1 − ((2/10)² + (4/10)² + (4/10)²) = 0.64');
  });
});

describe('forest experiment', () => {
  const def = forestExperiment('forest', { penguin: 4 });
  it('is valid', () => expect(validateExperiment(def)).toEqual([]));

  it('splits the 342 complete rows 239 / 103', () => {
    expect(FOREST_TRAIN.length).toBe(239);
    expect(FOREST_TEST.length).toBe(103);
  });

  it('counts votes consistently with growing the forest from scratch', () => {
    for (const s of [
      def.initial,
      { ...def.initial, trees: 7, penguin: 12 },
      { trees: 50, seed: 3, penguin: 91 },
    ]) {
      const r = computeForest(s);
      expect(r.votes).toEqual(votesFromScratch(s));
      expect(r.votes.reduce((a, b) => a + b, 0)).toBe(s.trees);
    }
  });

  it('reports accuracies between 0 and 1 and a curve with one point per tree count', () => {
    const r = computeForest(def.initial);
    expect(r.curve).toHaveLength(50);
    expect(r.forestAccuracy).toBe(r.curve[def.initial.trees - 1]);
    // fixed regression values for seed 1: tree 96/103, forest of 25 trees 99/103
    expect(Math.round(r.treeAccuracy * 103)).toBe(96);
    expect(Math.round(r.forestAccuracy * 103)).toBe(99);
  });
});

describe('boosting experiment', () => {
  const def = boostExperiment('boost');
  it('is valid', () => expect(validateExperiment(def)).toEqual([]));

  it('prints the MSE scikit-learn printed', () => {
    // ~/pyenv/bin/python: GradientBoostingRegressor(n_estimators=N, learning_rate=lr, max_depth=1) on the
    // 14 penguins, then print(round(mean_squared_error(y, model.predict(X)), 1))
    const cases: [BoostCase, string][] = [
      [{ learningRate: '0.3', stages: 3 }, '109733.1'],
      [{ learningRate: '1.0', stages: 10 }, '29839.2'],
      [{ learningRate: '0.1', stages: 30 }, '47484.1'],
      [{ learningRate: '0.1', stages: 1 }, '368790.8'],
    ];
    for (const [s, out] of cases) expect(boostPrintedMse(computeBoost(s), s.stages)).toBe(out);
  });
});

type BoostCase = ReturnType<typeof boostExperiment>['initial'];

describe('treeLayout', () => {
  it('puts leaves side by side and centers each split over its children', () => {
    const tree = computeSplit({ feature: 'bill_length_mm', candidate: 0, depth: 2 }).tree;
    const { nodes, edges } = treeLayout(tree, TREE_FEATURES, SPECIES);
    const at = (id: string) => nodes.find((n) => n.id === id)!;
    // leaves L, RL, RR at 0, 220, 440 (node 204 wide + 16 gap); R at 330; root at (0 + 330) / 2
    expect([at('L').x, at('RL').x, at('RR').x]).toEqual([0, 220, 440]);
    expect(at('R').x).toBe(330);
    expect(at('root').x).toBe(165);
    expect(at('root').label).toBe('bill_length_mm ≤ 41.95');
    expect(at('root').detail).toBe('gini 0.653 · [6, 4, 4]');
    expect(at('RR').label).toBe('leaf: Gentoo');
    expect(edges.map((e) => `${e.from}-${e.to} ${e.label}`)).toEqual([
      'root-L yes',
      'root-R no',
      'R-RL yes',
      'R-RR no',
    ]);
  });
});

it('toyXLiteral writes the rows the Python examples were run with', () => {
  expect(toyXLiteral()).toBe(
    '[[41.1, 182], [36.6, 185], [38.7, 195], [39, 186], [38.1, 190], [35.6, 191],\n' +
      '     [46.1, 215], [42.8, 209], [48.4, 203], [47.3, 216],\n' +
      '     [43.2, 187], [52.8, 205], [47.5, 199], [50.2, 202]]',
  );
  expect(boostSlots.X()).toBe(
    '[[182], [185], [195], [186], [190], [191], [215], [209], [203], [216], [187], [205], [199], [202]]',
  );
  expect(boostSlots.y()).toBe(
    '[3200, 3700, 3450, 3550, 3700, 3175, 5100, 4700, 4625, 4725, 2900, 4550, 3900, 3800]',
  );
});

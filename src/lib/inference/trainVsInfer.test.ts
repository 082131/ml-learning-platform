import { describe, expect, it } from 'vitest';
import { fillSlots } from '../code/slots';
import { validateExperiment } from '../experiment';
import { hasPython, runPython } from './testPython';
import {
  TRAIN_INFER_SOURCE,
  trainInferExperiment,
  trainInferPrintout,
  trainInferSlots,
  trainVsInfer,
  type TrainInferState,
} from './trainVsInfer';

const base: TrainInferState = { hidden: 512, layers: 2, batch: 64, optimizer: 'adam' };

describe('trainVsInfer', () => {
  it('counts a 784-512-512-10 MLP by hand', () => {
    const r = trainVsInfer(base);
    // 784·512 + 512 + 512·512 + 512 + 512·10 + 10
    expect(r.params).toBe(401_408 + 512 + 262_144 + 512 + 5_120 + 10);
    expect(r.params).toBe(669_706);
    expect(r.macs).toBe(401_408 + 262_144 + 5_120);
    // inference: the widest layer's input + output, 784 + 512 = 1296 values per example
    expect(r.inferAct).toBe(4 * 64 * 1296);
    // training: 784 + 2·(512 + 512) + 10 = 2842 values saved per example
    expect(r.trainAct).toBe(4 * 64 * 2842);
    expect(r.trainMemory).toBe(4 * 669_706 * 4 + 4 * 64 * 2842);
    expect(r.trainFlops).toBe(3 * r.inferFlops);
  });

  it('adds no optimizer state for plain SGD', () => {
    expect(trainVsInfer({ ...base, optimizer: 'sgd' }).optState).toBe(0);
    expect(trainVsInfer({ ...base, optimizer: 'momentum' }).optState).toBe(4 * 669_706);
  });

  it('is a valid experiment', () => {
    expect(validateExperiment(trainInferExperiment('t', base))).toEqual([]);
  });
});

describe.skipIf(!hasPython())('the printout equals what CPython prints', () => {
  const cases: TrainInferState[] = [
    base,
    { hidden: 64, layers: 1, batch: 1, optimizer: 'sgd' },
    { hidden: 4096, layers: 8, batch: 1024, optimizer: 'momentum' },
    { hidden: 1000, layers: 3, batch: 7, optimizer: 'adam' },
  ];
  it.each(cases.map((c) => [`${c.hidden}x${c.layers} b${c.batch} ${c.optimizer}`, c] as const))('%s', (_, s) => {
    const code = fillSlots(TRAIN_INFER_SOURCE, [], trainInferSlots(s)).source;
    expect(runPython(code)).toBe(trainInferPrintout(trainVsInfer(s)).join('\n'));
  });
});

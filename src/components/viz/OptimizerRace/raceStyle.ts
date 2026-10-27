import type { OptimizerId } from '@/lib/deep/optimizers';
import type { Tone } from '../svg/Arrow';

/** Each optimizer has a tone, a dash pattern and a marker shape, so color is never the only cue. */
export const RACE_STYLE: Record<
  OptimizerId,
  { tone: Tone; dash?: string; marker: 'circle' | 'square' | 'triangle'; short: string }
> = {
  sgd: { tone: 'ink', marker: 'circle', short: 'SGD' },
  momentum: { tone: 'accent', dash: '7 4', marker: 'square', short: 'Momentum' },
  adam: { tone: 'ok', dash: '2 3', marker: 'triangle', short: 'Adam' },
};

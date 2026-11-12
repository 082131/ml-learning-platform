import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  recordedExperiment,
  recordedReadout,
  recordedSlots,
  type RecordedFixture,
} from '@/lib/pycourse/recorded';
import parseJson from '@/lib/pycourse/fixtures/parse_amount.json';
import shapesJson from '@/lib/pycourse/fixtures/shapes.json';
import trainJson from '@/lib/pycourse/fixtures/torch_train.json';
import { Experiment } from '@/components/experiment/Experiment';
import { Readout } from '@/components/experiment/Readout';
import { RecordedCurves } from './RecordedCurves/RecordedCurves';
import { RecordedHist } from './RecordedHist/RecordedHist';
import { StateCards } from './StateCards/StateCards';

const parse = parseJson as RecordedFixture;
const shapes = shapesJson as RecordedFixture;
const train = trainJson as RecordedFixture;

describe('recorded experiments', () => {
  it('offers one select option per recorded variant and rejects an unknown initial variant', () => {
    const def = recordedExperiment('t', train, 'Training settings');
    expect(def.controls[0]).toMatchObject({ kind: 'select', label: 'Training settings' });
    expect(def.initial).toEqual({ variant: 'lr0.1-bs32' });
    expect(() => recordedExperiment('t', train, 'x', 'nope')).toThrow('no variant "nope"');
  });

  it('reads out one item per printed line, then the exception', () => {
    const negative = parse.variants.find((v) => v.id === 'negative')!;
    const items = recordedReadout(negative);
    expect(items.at(-1)).toEqual({
      label: 'raised',
      value: 'ValueError: negative amount: -3.0',
      status: 'error',
    });
    const lines = recordedReadout(train.variants[0]!);
    expect(lines.map((i) => i.value)).toEqual(train.variants[0]!.stdout.trim().split('\n'));
  });

  it('fills code slots with the selected variant’s text', () => {
    const slots = recordedSlots(train);
    expect(slots.zero!({ variant: 'lr0.1-bs32-nozero' })).toBe('pass  # opt.zero_grad() forgotten');
    expect(slots.lr!({ variant: 'lr10-bs32' })).toBe('10.0');
  });
});

describe('recorded visualizations', () => {
  it('StateCards and RecordedCurves follow the selected variant', async () => {
    const user = userEvent.setup();
    render(
      <Experiment def={recordedExperiment('t', train, 'Training settings')}>
        <RecordedCurves title="Loss per epoch" yDomain={[0, 3.5]} />
        <StateCards title="After 20 epochs" source="Recorded in PyTorch 2.14" />
        <Readout />
      </Experiment>,
    );
    const cards = screen.getByRole('figure', { name: 'After 20 epochs' });
    expect(within(cards).getByText('300')).toBeInTheDocument();
    const curves = screen.getByRole('figure', { name: 'Loss per epoch' });
    expect(curves).toHaveTextContent('Train loss 0.303');
    expect(curves.querySelectorAll('[data-series]')).toHaveLength(2);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Training settings' }), 'lr0.1-bs8');
    expect(within(cards).getByText('1200')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Result' })).toHaveTextContent('epoch 20 train 0.1110');
    expect(screen.getByRole('region', { name: 'Result' })).toHaveTextContent('recorded with PyTorch 2.14.1');

    await user.click(within(curves).getByRole('button', { name: 'Show table' }));
    const table = within(curves).getByRole('table');
    expect(within(table).getByRole('columnheader', { name: 'Validation loss' })).toBeInTheDocument();
    expect(within(table).getAllByRole('row')).toHaveLength(21); // header + 20 epochs
  });

  it('StateCards shows a recorded exception', async () => {
    const user = userEvent.setup();
    render(
      <Experiment def={recordedExperiment('p', parse, 'Input')}>
        <StateCards title="State" />
      </Experiment>,
    );
    await user.selectOptions(screen.getByRole('combobox', { name: 'Input' }), 'negative');
    expect(screen.getByRole('status')).toHaveTextContent('Raised: ValueError: negative amount: -3.0');
  });

  it('RecordedHist draws the recorded bins and labels the markers', () => {
    render(
      <Experiment def={recordedExperiment('s', shapes, 'Shape of the data')}>
        <RecordedHist title="Histogram" />
      </Experiment>,
    );
    const fig = screen.getByRole('figure', { name: 'Histogram' });
    const hist = shapes.variants[0]!.hist!;
    expect(fig).toHaveTextContent(
      `${hist.counts.reduce((a, b) => a + b, 0)} values in ${hist.counts.length} bins`,
    );
    expect(fig).toHaveTextContent('mean 49.73, median 49.5');
  });
});

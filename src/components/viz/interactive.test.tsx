import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { dot } from '@/lib/math/vector';
import { gradientDescentExperiment } from '@/lib/ml/gradientDescent';
import type { ExperimentDef } from '@/lib/types';
import { Experiment } from '@/components/experiment/Experiment';
import { Readout } from '@/components/experiment/Readout';
import { GradientDescent1D } from './GradientDescent1D/GradientDescent1D';
import { VectorPlane } from './VectorPlane/VectorPlane';

interface V {
  u: [number, number];
  v: [number, number];
  k: number;
}
const vectors: ExperimentDef<V, number> = {
  id: 'vec',
  initial: { u: [2, 1], v: [1, 3], k: 2 },
  controls: [],
  compute: (s) => dot(s.u, s.v),
  readout: (_s, r) => [{ label: 'u · v', value: String(r) }],
};

describe('VectorPlane', () => {
  it('moves a vector with the arrow keys and updates the derived arrows and the readout', async () => {
    const user = userEvent.setup();
    render(
      <Experiment def={vectors}>
        <VectorPlane vectors={['u', 'v']} show={['sum', 'scaled']} scaleKey="k" />
        <Readout />
      </Experiment>,
    );
    const u = screen.getByRole('slider', { name: 'Vector u' });
    expect(u).toHaveAttribute('aria-valuetext', '(2, 1)');
    expect(screen.getByRole('figure', { name: 'Vectors on a plane' })).toHaveTextContent(
      'u = (2, 1) · v = (1, 3) · u + v = (3, 4) · 2·u = (4, 2)',
    );
    expect(screen.getByRole('region', { name: 'Result' })).toHaveTextContent('5'); // 2·1 + 1·3
    u.focus();
    await user.keyboard('{ArrowRight}{ArrowRight}{ArrowDown}');
    expect(u).toHaveAttribute('aria-valuetext', '(3, 0.5)');
    expect(screen.getByRole('figure', { name: 'Vectors on a plane' })).toHaveTextContent('u + v = (4, 3.5)');
    expect(screen.getByRole('region', { name: 'Result' })).toHaveTextContent('4.5'); // 3·1 + 0.5·3
  });

  it('keeps dragged vectors inside the plane', async () => {
    const user = userEvent.setup();
    render(
      <Experiment def={{ ...vectors, initial: { u: [4.5, 0], v: [1, 1], k: 1 } }}>
        <VectorPlane vectors={['u']} />
      </Experiment>,
    );
    screen.getByRole('slider', { name: 'Vector u' }).focus();
    await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}');
    expect(screen.getByRole('slider', { name: 'Vector u' })).toHaveAttribute('aria-valuetext', '(5, 0)');
  });
});

describe('GradientDescent1D', () => {
  const def = gradientDescentExperiment('gd', { lr: 0.25, x0: 6, steps: 3 });
  it('shows the inspected step’s arithmetic, which follows the learning rate', () => {
    const { container } = render(
      <Experiment def={def}>
        <GradientDescent1D />
      </Experiment>,
    );
    expect(container.querySelector('[data-gd-step]')).toHaveTextContent(
      "x₁ = x₀ − η·f'(x₀) = 6 − 0.25 × 8 = 4",
    );
    fireEvent.change(screen.getByRole('slider', { name: 'Inspect step' }), { target: { value: '2' } });
    expect(container.querySelector('[data-gd-step]')).toHaveTextContent('= 3 − 0.25 × 2 = 2.5');
    fireEvent.change(screen.getByRole('slider', { name: 'Learning rate η' }), { target: { value: '0.5' } });
    expect(container.querySelector('[data-gd-step]')).toHaveTextContent('= 2 − 0.5 × 0 = 2');
  });

  it('labels divergence at a high learning rate', () => {
    const { container } = render(
      <Experiment def={gradientDescentExperiment('gd2', { lr: 1.5, steps: 50 })}>
        <GradientDescent1D />
        <Readout />
      </Experiment>,
    );
    expect(container.querySelector('[data-gd-status]')).toHaveAttribute('data-gd-status', 'diverged');
    expect(screen.getByText(/at step \d+: each update overshot/)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Result' })).toHaveTextContent('Diverged:');
  });
});

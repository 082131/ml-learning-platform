import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { matrixOpsExperiment } from '@/lib/linalg/matrixOps';
import { Experiment } from '@/components/experiment/Experiment';
import { MatrixOps } from './MatrixOps';

const def = matrixOpsExperiment('ops-test', [[1, 2, 3], [4, 5, 6]], [[10, 0, -1], [2, 3, 4]]);

describe('MatrixOps', () => {
  it('links an entry of A to its swapped position in Aᵀ, both ways', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Experiment def={def}>
        <MatrixOps op="transpose" />
      </Experiment>,
    );
    await user.click(screen.getByRole('button', { name: 'Aᵀ[2][1] = 6' }));
    expect(container.querySelector('[data-transpose-entry="1,2"]')).toHaveTextContent(
      'A[1][2] = 6 sits at Aᵀ[2][1]',
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'A[1][2]' }), { target: { value: '-7' } });
    expect(screen.getByRole('button', { name: 'Aᵀ[2][1] = -7' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('adds entry by entry and explains the selected sum', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Experiment def={def}>
        <MatrixOps op="add" />
      </Experiment>,
    );
    await user.click(screen.getByRole('button', { name: 'S[0][2] = 2' }));
    expect(container.querySelector('[data-sum-entry="0,2"]')).toHaveTextContent(
      'S[0][2] = A[0][2] + B[0][2] = 3 + (-1) = 2',
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'B[0][2]' }), { target: { value: '5' } });
    expect(screen.getByRole('button', { name: 'S[0][2] = 8' })).toBeInTheDocument();
  });
});

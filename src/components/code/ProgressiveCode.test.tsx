import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { CodeExample } from '@/lib/types';
import { ProgressiveCode } from './ProgressiveCode';

const example: CodeExample = {
  id: 'matmul-stages',
  language: 'python',
  source: '',
  annotations: [],
  stages: [
    {
      id: 'loops',
      title: 'Loops',
      source: 'for i in rows:\n    total = 0\n    out.append(total)',
      note: 'Start with loops.',
    },
    {
      id: 'numpy',
      title: 'NumPy',
      source: 'for i in rows:\n    out.append(A[i] @ B)',
      note: 'Replace the inner sum.',
    },
  ],
};

describe('ProgressiveCode', () => {
  it('shows each stage with its note, and marks added and removed lines in text, not only color', async () => {
    const user = userEvent.setup();
    const { container } = render(<ProgressiveCode example={example} />);
    expect(screen.getByRole('tab', { name: '1. Loops' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Start with loops.')).toBeVisible();

    await user.click(screen.getByRole('tab', { name: '2. NumPy' }));
    expect(screen.getByText('Replace the inner sum.')).toBeVisible();
    expect(screen.getByText('Compared with “Loops”: 1 line added, 2 removed.')).toBeVisible();
    const panel = screen.getByRole('tabpanel', { name: '2. NumPy' });
    const lines = [...panel.querySelectorAll('[data-diff]')].map((l) => [
      l.getAttribute('data-diff'),
      l.textContent,
    ]);
    expect(lines).toEqual([
      ['same', ' 1for i in rows:'],
      ['del', '−Removed:     total = 0'],
      ['del', '−Removed:     out.append(total)'],
      ['add', '+2Added:     out.append(A[i] @ B)'],
    ]);
    expect(container.querySelectorAll('[role="tab"]')).toHaveLength(2);
  });
});

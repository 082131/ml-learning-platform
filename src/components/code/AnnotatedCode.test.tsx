import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CodeExample } from '@/lib/types';
import { AnnotatedCode } from './AnnotatedCode';
import { SlotStateContext } from './slotState';

const note = (what: string) => ({ what, why: `why ${what}` });
export const example: CodeExample = {
  id: 'square',
  language: 'python',
  source: 'import numpy as np\nA = np.array({{A}})\nC = A @ A',
  slots: { A: (s) => JSON.stringify((s as { A: number[][] }).A).replaceAll(',', ', ') },
  annotations: [
    { id: 'import', range: { line: 1 }, kind: 'syntax', title: 'import numpy as np', ...note('Loads NumPy') },
    {
      id: 'np-array',
      range: { line: 2, startCol: 4, endCol: 12 },
      match: 'np.array',
      kind: 'framework',
      title: 'np.array',
      ...note('Builds an array'),
    },
    {
      id: 'literal',
      range: { line: 2, startCol: 13, endCol: 18 },
      match: '{{A}}',
      kind: 'variable',
      title: 'The values of A',
      ...note('Matrix values'),
    },
    {
      id: 'A',
      range: { line: 3, startCol: 4, endCol: 5 },
      match: 'A',
      kind: 'variable',
      title: 'A',
      ...note('The left matrix'),
    },
    {
      id: 'matmul',
      range: { line: 3, startCol: 6, endCol: 7 },
      match: '@',
      kind: 'math',
      title: '@ (matrix multiply)',
      ...note('Multiplies'),
    },
  ],
};

const panel = () => screen.getByText(/What it does/).closest('[data-annotation-panel]') as HTMLElement;

function mockPhone(matches: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

afterEach(() => vi.unstubAllGlobals());

describe('AnnotatedCode', () => {
  it('shows a preview on hover and pins on click; a second click unpins', async () => {
    const user = userEvent.setup();
    render(<AnnotatedCode example={example} />);
    await user.hover(screen.getByRole('button', { name: 'np.array' }));
    expect(panel()).toHaveTextContent('Builds an array');
    expect(panel()).toHaveTextContent('Preview');
    expect(panel()).toHaveTextContent('Framework API');

    await user.click(screen.getByRole('button', { name: '@' }));
    await user.unhover(screen.getByRole('button', { name: '@' }));
    expect(panel()).toHaveTextContent('Pinned');
    expect(panel()).toHaveTextContent('Multiplies');
    expect(screen.getByRole('button', { name: '@' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: '@' }));
    expect(screen.queryByText('Pinned')).not.toBeInTheDocument();
  });

  it('is one tab stop with arrow-key navigation, Enter to pin and Escape to unpin', async () => {
    const user = userEvent.setup();
    render(
      <>
        <AnnotatedCode example={example} />
        <button type="button">after</button>
      </>,
    );
    await user.tab();
    const lineNote = screen.getByRole('button', { name: 'Line 1: import numpy as np' });
    expect(lineNote).toHaveFocus();
    expect(panel()).toHaveTextContent('Loads NumPy');

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: 'np.array' })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('button', { name: '{{A}}' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: 'A' })).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('button', { name: 'np.array' })).toHaveFocus();
    await user.keyboard('{End}{Enter}');
    expect(panel()).toHaveTextContent('Pinned');
    expect(panel()).toHaveTextContent('@ (matrix multiply)');
    await user.keyboard('{Escape}');
    expect(screen.queryByText('Pinned')).not.toBeInTheDocument();

    await user.tab();
    expect(screen.getByRole('button', { name: 'after' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: '@' })).toHaveFocus();
  });

  it('highlights the active line and labels every kind in a legend', async () => {
    const user = userEvent.setup();
    const { container } = render(<AnnotatedCode example={example} />);
    await user.click(screen.getByRole('button', { name: 'A' }));
    const active = container.querySelectorAll('[class*="activeLine"]');
    expect(active).toHaveLength(1);
    expect(active[0]).toHaveTextContent('C = A @ A');
    const legend = screen.getByRole('list', { name: 'Underline styles' });
    expect(
      within(legend)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['abcSyntax', 'abcFramework API', 'abcVariable', 'abcMath operation']);
  });

  it('fills slots from experiment state and keeps annotations on the filled values', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <SlotStateContext.Provider
        value={{
          A: [
            [1, 2],
            [3, 4],
          ],
        }}
      >
        <AnnotatedCode example={example} />
      </SlotStateContext.Provider>,
    );
    expect(screen.getByRole('button', { name: '[[1, 2], [3, 4]]' })).toBeInTheDocument();
    rerender(
      <SlotStateContext.Provider
        value={{
          A: [
            [10, 2],
            [3, 4],
          ],
        }}
      >
        <AnnotatedCode example={example} />
      </SlotStateContext.Provider>,
    );
    await user.click(screen.getByRole('button', { name: '[[10, 2], [3, 4]]' }));
    expect(panel()).toHaveTextContent('Matrix values');
  });

  it('opens the pinned explanation in a bottom sheet on phones', async () => {
    mockPhone(true);
    const user = userEvent.setup();
    render(<AnnotatedCode example={example} />);
    await user.click(screen.getByRole('button', { name: 'np.array' }));
    const sheet = screen.getByRole('dialog', { name: 'np.array' });
    expect(sheet).toHaveTextContent('Builds an array');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'np.array' })).toHaveAttribute('aria-pressed', 'false');
  });
});

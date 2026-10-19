import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { curriculum } from '@/app/content';
import { setComplete, recordView } from '@/lib/progress/actions';
import { emptyState } from '@/lib/progress/schema';
import { renderWithApp } from '@/test/render';
import { PixelProgressGrid } from './PixelProgressGrid';

describe('PixelProgressGrid', () => {
  const lessons = curriculum.lessonsOf('ml').slice(0, 4);
  const progress = recordView(
    setComplete(emptyState(), lessons[0]!.ref.id, true, new Date()),
    lessons[2]!.ref.id,
  );

  it('has one link per lesson, labeled with its state, with a single tab stop', () => {
    renderWithApp(
      <PixelProgressGrid label="Map" groups={[{ id: 'g', label: 'G', lessons }]} progress={progress} />,
    );
    const cells = screen.getAllByRole('link');
    expect(cells).toHaveLength(4);
    expect(cells[0]).toHaveAccessibleName(/^001 What AI, ML and deep learning actually mean: Complete$/);
    expect(cells[1]).toHaveAccessibleName(/: Outline only$/);
    expect(cells[2]).toHaveAccessibleName(/: In progress$/);
    expect(cells.filter((c) => c.tabIndex === 0)).toHaveLength(1);
    expect(screen.getByRole('list', { name: 'Legend' })).toHaveTextContent('Complete 1');
  });

  it('moves focus with arrow keys and shows the focused lesson in the readout', async () => {
    renderWithApp(
      <PixelProgressGrid label="Map" groups={[{ id: 'g', label: 'G', lessons }]} progress={progress} />,
    );
    await userEvent.tab();
    const cells = screen.getAllByRole('link');
    expect(cells[0]).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    expect(cells[2]).toHaveFocus();
    expect(screen.getByText(lessons[2]!.meta.title, { exact: false })).toBeInTheDocument();
    await userEvent.keyboard('{End}');
    expect(cells[3]).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(cells[3]).toHaveFocus();
    await userEvent.keyboard('{Home}{ArrowLeft}');
    expect(cells[0]).toHaveFocus();
    expect(cells[0]).toHaveAttribute('href', `/learn/${lessons[0]!.ref.id}`);
  });
});

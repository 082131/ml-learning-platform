import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ScatterPlot, type ScatterGroup } from './ScatterPlot';

const groups: ScatterGroup[] = [
  { id: 'a', label: 'Adelie', tone: 'accent', shape: 'circle' },
  { id: 'g', label: 'Gentoo', tone: 'ink', shape: 'triangle' },
];
const points = [
  { x: 1, y: 2, group: 'a', id: 0 },
  { x: 3, y: 5, group: 'g', id: 1, hollow: true },
  { x: 2, y: 4, group: 'g', id: 2 },
];

describe('ScatterPlot', () => {
  it('draws one marker per point, shaped by group, with a legend and a ring on selected points', () => {
    const { container } = render(
      <ScatterPlot title="Bills" points={points} groups={groups} xLabel="x" yLabel="y" selected={[2]} />,
    );
    expect(screen.getByRole('img', { name: 'Bills: y against x, 3 points' })).toBeInTheDocument();
    expect(container.querySelectorAll('[data-group="a"] circle')).toHaveLength(1);
    expect(container.querySelectorAll('[data-group="g"] polygon')).toHaveLength(2);
    expect(container.querySelectorAll('circle[class*="ring"]')).toHaveLength(1);
    expect(screen.getByRole('list', { name: 'Legend' })).toHaveTextContent('AdelieGentoo');
  });

  it('lists every point in its table view, and reports clicks', async () => {
    const user = userEvent.setup();
    const onPointClick = vi.fn();
    const { container } = render(
      <ScatterPlot
        title="Bills"
        points={points}
        groups={groups}
        xLabel="length"
        yLabel="depth"
        onPointClick={onPointClick}
      />,
    );
    await user.click(container.querySelector('[data-point="0"]')!);
    expect(onPointClick).toHaveBeenCalledWith(points[0]);
    await user.click(screen.getByRole('button', { name: 'Show table' }));
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(4);
    expect(rows[2]).toHaveTextContent('135Gentoo (hollow)');
  });
});

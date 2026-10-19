import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { scaleLinear } from 'd3-scale';
import { describe, expect, it, vi } from 'vitest';
import { BarCompare } from './BarCompare/BarCompare';
import { FlowDiagram } from './FlowDiagram/FlowDiagram';
import { LineChart } from './LineChart/LineChart';
import { MatrixGrid } from './MatrixGrid/MatrixGrid';
import { Arrow } from './svg/Arrow';
import { Axes, Grid } from './svg/Axes';
import { VizFrame } from './VizFrame/VizFrame';

describe('VizFrame', () => {
  it('switches between the visual and its table alternative', async () => {
    const user = userEvent.setup();
    render(
      <VizFrame title="Demo" caption="Two values." table={<table aria-label="values" />}>
        <svg aria-label="the chart" role="img" />
      </VizFrame>,
    );
    expect(screen.getByRole('figure', { name: 'Demo' })).toHaveTextContent('Two values.');
    expect(screen.getByRole('img', { name: 'the chart' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show table' }));
    expect(screen.getByRole('table', { name: 'values' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'the chart' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Show visual' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('SVG primitives', () => {
  it('Axes and Grid draw a tick per scale tick, and Arrow draws its head at the target', () => {
    const x = scaleLinear().domain([0, 10]).range([0, 100]);
    const y = scaleLinear().domain([0, 4]).range([50, 0]);
    const { container } = render(
      <svg>
        <Grid x={x} y={y} ticks={2} />
        <Axes x={x} y={y} ticks={2} xLabel="epoch" />
        <Arrow from={[0, 0]} to={[10, 0]} size={4} label="u" />
      </svg>,
    );
    expect(container).toHaveTextContent('epoch');
    expect([...container.querySelectorAll('text')].map((t) => t.textContent)).toEqual(
      expect.arrayContaining(['0', '5', '10', '2', '4', 'u']),
    );
    expect(container.querySelector('polygon')).toHaveAttribute('points', '10,0 6,2 6,-2');
  });
});

describe('MatrixGrid', () => {
  const values = [
    [1, 2, 3],
    [4, 5, 6],
  ];
  it('shows indices and shape, and marks highlighted rows and columns in text as well as color', () => {
    render(<MatrixGrid name="A" values={values} highlightRows={[1]} highlightCols={[2]} />);
    const table = screen.getByRole('table', { name: 'A shape (2, 3)' });
    expect(within(table).getByRole('rowheader', { name: 'row 1 (highlighted)' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'column 2 (highlighted)' })).toBeInTheDocument();
    expect(table.querySelector('[data-cell="1,0"]')?.className).toMatch(/hot/);
    expect(table.querySelector('[data-cell="0,0"]')?.className).not.toMatch(/hot/);
  });

  it('reports only valid edits and explains invalid ones', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <MatrixGrid name="A" values={values} onChange={onChange} limits={{ integer: true, min: -9, max: 9 }} />,
    );
    const cell = screen.getByRole('textbox', { name: 'A[0][1]' });
    await user.clear(cell);
    await user.type(cell, '7');
    expect(onChange).toHaveBeenLastCalledWith(0, 1, 7);
    await user.type(cell, '0');
    expect(screen.getByRole('alert')).toHaveTextContent('A[0][1]: Enter a number from -9 to 9.');
    expect(onChange).toHaveBeenCalledTimes(1);
    await user.tab();
    expect(cell).toHaveValue('2'); // the prop value, since the parent ignored the edit in this test
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('selects cells as toggle buttons', async () => {
    const onSelect = vi.fn();
    render(<MatrixGrid name="C" values={values} selected={[0, 1]} onSelect={onSelect} />);
    expect(screen.getByRole('button', { name: 'C[0][1] = 2' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'C[1][2] = 6' }));
    expect(onSelect).toHaveBeenCalledWith(1, 2);
  });
});

describe('LineChart', () => {
  it('draws one path per series, breaks the line at diverged values, and lists values in the table', async () => {
    const { container } = render(
      <LineChart
        title="Loss"
        xLabel="step"
        yLabel="loss"
        series={[
          {
            id: 'a',
            label: 'train',
            points: [
              [0, 4],
              [1, 2],
              [2, 1],
            ],
          },
          {
            id: 'b',
            label: 'diverging',
            points: [
              [0, 1],
              [1, Infinity],
              [2, 3],
            ],
            dashed: true,
          },
        ]}
      />,
    );
    const paths = container.querySelectorAll('[data-series] path');
    expect(paths).toHaveLength(2);
    expect(paths[1]?.getAttribute('d')?.match(/M/g)).toHaveLength(2); // two pieces around Infinity
    expect(screen.getByRole('list', { name: 'Legend' })).toHaveTextContent('traindiverging');
    await userEvent.click(screen.getByRole('button', { name: 'Show table' }));
    const rows = screen.getAllByRole('row').map((r) => r.textContent);
    expect(rows).toEqual(['steptraindiverging', '041', '12diverged', '213']);
  });
});

describe('BarCompare', () => {
  it('shows before values left of the split and moves the split with the keyboard', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <BarCompare
        title="Memory"
        before={{ label: 'FP32', values: [4, 4, 4, 4] }}
        after={{ label: 'INT8', values: [1, 1, 1, 1] }}
        categoryLabel="layer"
        valueLabel="bytes"
        initialSplit={2}
      />,
    );
    const handle = screen.getByRole('slider', { name: 'Split between FP32 and INT8' });
    expect(handle).toHaveAttribute('aria-valuenow', '2');
    const kinds = () => [...container.querySelectorAll('rect')].map((r) => r.getAttribute('class'));
    expect(
      kinds()
        .map((k) => (k?.includes('before') ? 'b' : 'a'))
        .join(''),
    ).toBe('bbaa');
    handle.focus();
    await user.keyboard('{ArrowRight}');
    expect(handle).toHaveAttribute('aria-valuenow', '3');
    expect(
      kinds()
        .map((k) => (k?.includes('before') ? 'b' : 'a'))
        .join(''),
    ).toBe('bbba');
    await user.keyboard('{Home}');
    expect(handle).toHaveAttribute('aria-valuetext', '0 bars show FP32, 4 show INT8');
  });

  it('jumps to the split under the pointer', () => {
    const { container } = render(
      <BarCompare
        title="M"
        before={{ label: 'A', values: [1, 1, 1, 1] }}
        after={{ label: 'B', values: [2, 2, 2, 2] }}
        categoryLabel="c"
        valueLabel="v"
      />,
    );
    const svg = container.querySelector('svg[role="img"]')!;
    // jsdom has no layout: the bounding box starts at 0 and the width falls back to 640px.
    fireEvent.pointerDown(svg, { clientX: 470, pointerId: 1 });
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '3');
  });
});

describe('FlowDiagram', () => {
  const nodes = [
    { id: 'src', label: 'Source', x: 0, y: 0 },
    { id: 'tx', label: 'Transform', x: 220, y: 80, status: 'error' as const, detail: '3 bad rows' },
  ];
  it('labels nodes with their status in words and lists connections in the table', async () => {
    const { container } = render(
      <FlowDiagram
        title="Pipeline"
        nodes={nodes}
        edges={[{ from: 'src', to: 'tx', label: 'rows', junction: 'square' }]}
      />,
    );
    // Browsers name SVG nodes from their <title>; jsdom does not, so check the title itself.
    expect(container.querySelector('[data-node="tx"] > title')).toHaveTextContent(
      'Transform, 3 bad rows, failed',
    );
    expect(container.querySelector('[data-node="tx"]')).toHaveAttribute('role', 'img');
    expect(container.querySelector('[data-edge="src-tx"] path')?.getAttribute('d')).toMatch(/^M140,28 /);
    expect(container.querySelector('[data-edge="src-tx"] rect')).not.toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Show table' }));
    expect(screen.getAllByRole('row').map((r) => r.textContent)).toEqual([
      'FromToNote',
      'SourceTransformrows',
    ]);
  });

  it('makes nodes keyboard-selectable buttons when onSelect is given', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const { container } = render(
      <FlowDiagram
        title="P"
        nodes={nodes}
        edges={[{ from: 'src', to: 'tx' }]}
        onSelect={onSelect}
        selected="src"
      />,
    );
    const node = (id: string) => container.querySelector<SVGGElement>(`[data-node="${id}"]`)!;
    expect(node('src')).toHaveAttribute('role', 'button');
    expect(node('src')).toHaveAttribute('aria-pressed', 'true');
    node('tx').focus();
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith('tx');
  });
});

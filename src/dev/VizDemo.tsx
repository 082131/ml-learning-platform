import { useState, type ReactNode } from 'react';
import { Experiment } from '@/components/experiment/Experiment';
import { Readout } from '@/components/experiment/Readout';
import { BarCompare } from '@/components/viz/BarCompare/BarCompare';
import { FlowDiagram } from '@/components/viz/FlowDiagram/FlowDiagram';
import { GradientDescent1D } from '@/components/viz/GradientDescent1D/GradientDescent1D';
import { LineChart } from '@/components/viz/LineChart/LineChart';
import { VectorPlane } from '@/components/viz/VectorPlane/VectorPlane';
import { Badge } from '@/components/ui';
import * as demo from './vizDemoContent';
import s from './ComponentsDemo.module.css';

function Demo({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className={s.demo} aria-labelledby={`${id}-title`} id={id}>
      <h2 id={`${id}-title`} className={s.title}>
        {title}
      </h2>
      {children}
    </section>
  );
}

const sq = Array.from({ length: 11 }, (_, i) => [i - 5, (i - 5) ** 2] as const);

/** Every visualization primitive with sample data. Built in dev and e2e builds only. */
export default function VizDemo() {
  const [selected, setSelected] = useState('validate');
  return (
    <div className={s.page}>
      <h1 className={s.h1}>
        <span className={s.slash} aria-hidden="true">
          /
        </span>{' '}
        Visualization components
      </h1>
      <p className={s.lead}>Developer demo of the experiment framework and visualization primitives.</p>

      <Demo id="gd" title="Experiment: gradient descent">
        <Experiment def={demo.gdExperiment} title="Gradient descent in 1-D">
          <GradientDescent1D />
          <Readout />
        </Experiment>
      </Demo>

      <Demo id="vectors" title="Experiment: vector plane">
        <Experiment def={demo.vectorExperiment} title="Drag u and v">
          <VectorPlane vectors={['u', 'v']} show={['sum', 'scaled']} scaleKey="k" />
          <Readout />
        </Experiment>
      </Demo>

      <Demo id="line" title="Line chart">
        <LineChart
          title="y = x²"
          xLabel="x"
          yLabel="y"
          series={[
            { id: 'sq', label: 'x²', points: sq, dots: true },
            {
              id: 'lin',
              label: '2x + 3',
              points: sq.map(([x]) => [x, 2 * x + 3] as const),
              tone: 'ink',
              dashed: true,
            },
          ]}
        />
      </Demo>

      <Demo id="bars" title="Bar compare">
        <BarCompare
          title="Weight memory per layer"
          before={{ label: 'FP32', values: demo.memoryBefore }}
          after={{ label: 'INT8', values: demo.memoryAfter }}
          categoryLabel="layer"
          valueLabel="MB"
          badge={<Badge tone="warn">Estimate</Badge>}
          caption="Parameters × bytes per parameter (FP32: 4, INT8: 1). Quantization scales are not counted."
        />
      </Demo>

      <Demo id="flow" title="Flow diagram">
        <FlowDiagram
          title="A small ETL pipeline"
          nodes={demo.pipelineNodes}
          edges={demo.pipelineEdges}
          selected={selected}
          onSelect={setSelected}
          caption={`Selected: ${selected}`}
        />
      </Demo>
    </div>
  );
}

import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import { pyFixed } from '@/lib/inference/format';
import type { HpaResult, HpaState } from '@/lib/deploy/hpa';
import { LineChart, type XY } from '../LineChart/LineChart';

const xy = (xs: number[], ys: number[]): XY[] => xs.map((x, i) => [x, ys[i]!]);

/** Demand against the capacity of ready pods, and replicas asked for against replicas ready. */
export function HpaCharts() {
  const { state: s, result: r } = useExperimentContext<HpaState, HpaResult>('HpaCharts');
  const top = Math.max(...r.demand, ...r.capacity) * 1.1;
  return (
    <div
      data-hpa-over={pyFixed(r.overPct, 1)}
      data-hpa-peak={r.peakReplicas}
    >
      <LineChart
        title="Traffic and the capacity of ready pods"
        xLabel="minute"
        yLabel="requests per second"
        badge={<Badge tone="simulated">Simulated</Badge>}
        series={[
          { id: 'demand', label: 'Demand', points: xy(r.minutes, r.demand), inTable: false },
          { id: 'capacity', label: 'Capacity of ready pods', points: xy(r.minutes, r.capacity), tone: 'muted', dashed: true, inTable: false },
        ]}
        xDomain={[0, 40]}
        yDomain={[0, top]}
        caption={`Peak ${s.peak} rps. ${pyFixed(r.overPct, 1)}% of requests arrived while demand exceeded ready capacity, over ${pyFixed(r.overMinutes, 2)} minutes. Each pod serves ${50} rps; new pods take ${s.coldStart} s to load the model.`}
      />
      <LineChart
        title="Replicas requested by the HPA and replicas ready"
        xLabel="minute"
        yLabel="pods"
        badge={<Badge tone="simulated">Simulated</Badge>}
        series={[
          { id: 'replicas', label: 'Replicas (spec)', points: xy(r.minutes, r.replicas), inTable: false },
          { id: 'ready', label: 'Ready', points: xy(r.minutes, r.ready), tone: 'muted', dashed: true, inTable: false },
        ]}
        xDomain={[0, 40]}
        yDomain={[0, Math.max(...r.replicas) + 2]}
        caption={`Peak ${r.peakReplicas} replicas, ${pyFixed(r.podMinutes, 2)} pod-minutes in 40 minutes. Target ${s.target}% CPU, minimum ${s.minReplicas}, scale-down window ${s.window} s.`}
      />
    </div>
  );
}

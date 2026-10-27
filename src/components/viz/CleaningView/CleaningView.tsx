import type { CleaningExperimentResult, CleaningState } from '@/lib/classical/cleaning';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { CleaningTable } from './CleaningTable';
import { MassStrip } from './MassStrip';
import s from './CleaningView.module.css';

/** The data-cleaning experiment's views (use inside an Experiment made with cleaningExperiment). */
export function CleaningView({ show = 'both' }: { show?: 'table' | 'strip' | 'both' }) {
  const { result } = useExperimentContext<CleaningState, CleaningExperimentResult>('CleaningView');
  return (
    <div className={s.layout}>
      {show !== 'strip' && <CleaningTable result={result} />}
      {show !== 'table' && <MassStrip result={result} />}
    </div>
  );
}

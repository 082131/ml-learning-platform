import { useContext, useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { fillExample } from '@/lib/code/slots';
import type { CodeExample, Trace, TraceSource } from '@/lib/types';
import { Badge, SimulatedBadge } from '@/components/ui';
import { PlainCode } from './PlainCode';
import { ExperimentTraceContext, SlotStateContext } from './slotState';
import { StepControls } from './StepControls';
import { VariablesPanel } from './VariablesPanel';
import { useRecordedTrace } from './useRecordedTrace';
import code from './Code.module.css';
import s from './StepThrough.module.css';

export const PLAY_INTERVAL_MS = 1000;

interface StepThroughProps {
  example: CodeExample;
  /**
   * A computed or simulated trace. Inside an Experiment, its `def.trace(state)` is used when this is
   * left out. Without either, a Python example can be recorded in Pyodide on demand.
   */
  trace?: Trace;
  title?: string;
}

/** Shown on every trace so nobody mistakes a simulation for a real run (constitution II). */
export function SourceBadge({ source }: { source: TraceSource }) {
  if (source === 'simulated') return <SimulatedBadge />;
  return (
    <Badge tone="ok">
      {source === 'pyodide' ? 'Recorded in Python (Pyodide)' : 'Computed in your browser'}
    </Badge>
  );
}

/** Steps through code line by line with the variables in scope (FR-005). ←/→ move between steps. */
export function StepThrough({ example, trace: given, title }: StepThroughProps) {
  const state = useContext(SlotStateContext);
  const { source } = useMemo(() => fillExample(example, state), [example, state]);
  const recorded = useRecordedTrace(source);
  const linked = useContext(ExperimentTraceContext);
  const fromExperiment =
    linked && (!linked.exampleId || linked.exampleId === example.id) ? linked.trace : undefined;
  const trace = given ?? fromExperiment ?? recorded.trace;
  const count = trace?.steps.length ?? 0;
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const current = Math.min(index, Math.max(count - 1, 0));

  // Playback stops by itself on the last step.
  const isPlaying = playing && current < count - 1;
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setTimeout(() => setIndex(current + 1), PLAY_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [isPlaying, current]);
  const togglePlay = () => {
    if (isPlaying) return setPlaying(false);
    if (current >= count - 1) setIndex(0);
    setPlaying(true);
  };

  const go = (i: number) => {
    setPlaying(false);
    setIndex(Math.max(0, Math.min(i, count - 1)));
  };
  const onKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.matches('input, textarea, select') || !count) return;
    const to = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: count - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    go(to);
  };

  const step = trace?.steps[current];
  return (
    <figure className={code.block} data-wide data-step-through={example.id} onKeyDown={onKeyDown}>
      <div className={code.frame}>
        <div className={code.header}>
          <span>{title ?? example.language} · step-through</span>
          {trace && <SourceBadge source={trace.source} />}
        </div>
        <div className={s.layout}>
          <PlainCode
            source={source}
            language={example.language}
            label={`${title ?? example.language} code`}
            active={step?.range}
          />
          {trace && step ? (
            <div className={s.side}>
              <p className={s.note} aria-live="polite">
                {step.note}
              </p>
              <VariablesPanel step={step} prev={trace.steps[current - 1]} />
            </div>
          ) : (
            <div className={s.side}>
              {example.language === 'python' ? (
                recorded.panel
              ) : (
                <p>No trace is available for this example.</p>
              )}
            </div>
          )}
        </div>
        {trace && count > 0 && (
          <StepControls
            index={current}
            count={count}
            playing={isPlaying}
            onGo={go}
            onTogglePlay={togglePlay}
          />
        )}
      </div>
      {!given && !fromExperiment && recorded.notice && (
        <p role="status" className={s.error}>
          {recorded.notice}
        </p>
      )}
      {trace?.source === 'simulated' && (
        <figcaption className={s.figcaption}>
          This trace was written out by hand to show what the code does. It was not produced by running the
          code.
        </figcaption>
      )}
    </figure>
  );
}

import { useEffect, useRef } from 'react';
import { useExperimentContext } from './ExperimentContext';
import s from './Experiment.module.css';

const STATUS_LABEL = { ok: '', diverged: 'Diverged', error: 'Error' } as const;

/** The experiment's computed values (`def.readout(state, result)`), labeled as computed. */
export function Readout({ title = 'Result' }: { title?: string }) {
  const { def, state, result } = useExperimentContext<unknown, unknown>('Readout');
  const items = def.readout?.(state, result) ?? [];
  const ref = useRef<HTMLElement>(null);
  // A long value scrolls inside its cell; make that cell focusable so keyboard users can scroll it
  // (axe scrollable-region-focusable). Runs after every render, because values change with state.
  useEffect(() => {
    ref.current?.querySelectorAll<HTMLElement>('dd').forEach((dd) => {
      if (dd.scrollWidth > dd.clientWidth + 1) dd.tabIndex = 0;
      else dd.removeAttribute('tabindex');
    });
  });
  if (items.length === 0) return null;
  return (
    <section ref={ref} className={s.readout} aria-label={title} data-readout>
      <h3 className={s.readoutTitle}>
        {title} <span className={s.computed}>computed in your browser</span>
      </h3>
      <dl className={s.list}>
        {items.map((item) => (
          <div key={item.label} className={s.item} data-status={item.status ?? 'ok'}>
            <dt>{item.label}</dt>
            <dd>
              {item.status && item.status !== 'ok' && (
                <strong className={s.flag}>{STATUS_LABEL[item.status]}: </strong>
              )}
              <span className={s.value}>{item.value}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

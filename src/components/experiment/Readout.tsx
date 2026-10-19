import { useExperimentContext } from './ExperimentContext';
import s from './Experiment.module.css';

const STATUS_LABEL = { ok: '', diverged: 'Diverged', error: 'Error' } as const;

/** The experiment's computed values (`def.readout(state, result)`), labeled as computed. */
export function Readout({ title = 'Result' }: { title?: string }) {
  const { def, state, result } = useExperimentContext<unknown, unknown>('Readout');
  const items = def.readout?.(state, result) ?? [];
  if (items.length === 0) return null;
  return (
    <section className={s.readout} aria-label={title} data-readout>
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

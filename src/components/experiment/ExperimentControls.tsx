import { applyControl } from '@/lib/experiment';
import type { Control } from '@/lib/types';
import { NumberField, Slider } from '@/components/ui';
import { MatrixGrid } from '@/components/viz/MatrixGrid/MatrixGrid';
import { useExperimentContext } from './ExperimentContext';
import f from '@/components/ui/Field.module.css';
import s from './Experiment.module.css';

/** Renders `def.controls`. Every change goes through the experiment's single reducer. */
export function ExperimentControls() {
  const { def, state, update } = useExperimentContext<unknown, unknown>('ExperimentControls');
  const set = (c: Control<unknown>, v: number | string) => update((st) => applyControl(c, st, v));
  return (
    <div className={s.controls} role="group" aria-label="Experiment controls">
      {def.controls.map((c) => {
        switch (c.kind) {
          case 'slider':
            return (
              <div key={c.id} className={s.control}>
                <Slider
                  label={c.label}
                  value={c.get(state)}
                  min={c.min}
                  max={c.max}
                  step={c.step}
                  format={c.format}
                  onChange={(v) => set(c, v)}
                />
              </div>
            );
          case 'number':
            return (
              <div key={c.id} className={s.control}>
                <NumberField
                  label={c.label}
                  value={c.get(state)}
                  min={c.min}
                  max={c.max}
                  step={c.step}
                  onChange={(v) => set(c, v)}
                />
              </div>
            );
          case 'select':
            return (
              <label key={c.id} className={`${s.control} ${f.field}`}>
                <span className={f.label}>{c.label}</span>
                <select className={f.input} value={c.get(state)} onChange={(e) => set(c, e.target.value)}>
                  {c.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            );
          case 'text':
            return (
              <label key={c.id} className={`${s.control} ${f.field}`}>
                <span className={f.label}>{c.label}</span>
                <input
                  className={f.input}
                  value={c.get(state)}
                  maxLength={c.maxLength}
                  onChange={(e) => set(c, e.target.value)}
                />
              </label>
            );
          case 'matrix-cell': {
            const hl = c.highlight?.(state) ?? {};
            return (
              <div key={c.id} className={s.matrix}>
                <MatrixGrid
                  name={c.label}
                  values={c.get(state)}
                  limits={c}
                  highlightRows={hl.rows}
                  highlightCols={hl.cols}
                  onChange={(i, j, v) => update((st) => c.set(st, i, j, v))}
                />
              </div>
            );
          }
        }
      })}
    </div>
  );
}

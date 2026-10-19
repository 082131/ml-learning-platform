import { useId } from 'react';
import s from './Field.module.css';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  /** Formats the displayed value, for example as a percentage. */
  format?: (value: number) => string;
}

export function Slider({ label, value, min, max, step = 1, onChange, format = String }: SliderProps) {
  const id = useId();
  return (
    <div className={s.field}>
      <div className={s.row}>
        <label htmlFor={id} className={s.label}>
          {label}
        </label>
        <output htmlFor={id} className={s.value}>
          {format(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        className={s.range}
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={format(value)}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

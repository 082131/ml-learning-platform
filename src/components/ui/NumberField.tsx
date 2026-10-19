import { useId, useState } from 'react';
import s from './Field.module.css';

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

/** A number input that only reports valid, in-range values and explains invalid ones. */
export function NumberField({
  label,
  value,
  onChange,
  min = -Infinity,
  max = Infinity,
  step = 1,
}: NumberFieldProps) {
  const id = useId();
  const [text, setText] = useState(String(value));
  const [prevValue, setPrevValue] = useState(value);
  // Follow changes to the value prop (e.g. a reset) without clobbering what the learner is typing.
  if (value !== prevValue) {
    setPrevValue(value);
    if (Number(text) !== value) setText(String(value));
  }

  const parsed = text.trim() === '' ? NaN : Number(text);
  const error = !Number.isFinite(parsed)
    ? 'Enter a number.'
    : parsed < min || parsed > max
      ? `Enter a number from ${min} to ${max}.`
      : undefined;

  return (
    <div className={s.field}>
      <label htmlFor={id} className={s.label}>
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        className={s.input}
        value={text}
        min={Number.isFinite(min) ? min : undefined}
        max={Number.isFinite(max) ? max : undefined}
        step={step}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => {
          setText(e.target.value);
          const n = Number(e.target.value);
          if (e.target.value.trim() !== '' && Number.isFinite(n) && n >= min && n <= max) {
            onChange(n);
          }
        }}
      />
      {error && (
        <p id={`${id}-error`} className={s.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

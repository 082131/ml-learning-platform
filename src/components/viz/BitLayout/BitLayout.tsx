import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { bias, formatRange } from '@/lib/inference/floatBits';
import { shown, type BitsResult, type BitsState, type FloatRow } from '@/lib/inference/bitsExperiment';
import { formatNumber } from '@/lib/trace/values';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './BitLayout.module.css';

const FIELD_LABEL = { sign: 's', exponent: 'exponent', mantissa: 'mantissa', integer: 'integer' } as const;

function Bits({ fields, name }: { fields: Partial<Record<keyof typeof FIELD_LABEL, string>>; name: string }) {
  return (
    <span className={s.bits} role="img" aria-label={`${name} bits: ${Object.values(fields).join(' ')}`}>
      {(Object.keys(fields) as (keyof typeof FIELD_LABEL)[]).map((k) => (
        <span key={k} className={s.field} data-field={k}>
          {[...fields[k]!].map((b, i) => (
            <span key={i} className={s.bit} aria-hidden="true">
              {b}
            </span>
          ))}
          <span className={s.fieldName} aria-hidden="true">
            {FIELD_LABEL[k]}
          </span>
        </span>
      ))}
    </span>
  );
}

/** How the stored fields turn back into the value: (−1)^s × 1.m × 2^(e − bias). */
function decode(row: FloatRow) {
  const { enc, format } = row;
  if (enc.kind === 'infinity') return 'exponent all ones, mantissa 0: infinity (overflow)';
  if (enc.kind === 'zero') return 'exponent and mantissa all zeros: zero';
  const M = format.mantissaBits;
  const lead = enc.kind === 'normal' ? '1' : '0';
  const e = enc.kind === 'normal' ? enc.exponent - bias(format) : 1 - bias(format);
  const sign = enc.sign ? '−' : '+';
  return `${sign}(${lead} + ${enc.mantissa} / ${2 ** M}) × 2^${e} = ${shown(enc.value)}${enc.kind === 'subnormal' ? ' (subnormal: no leading 1)' : ''}`;
}

/** The typed number in FP32, FP16, BF16 and INT8: bit fields, stored value and rounding error. */
export function BitLayout() {
  const { state, result } = useExperimentContext<BitsState, BitsResult>('BitLayout');
  if (result.input === undefined)
    return (
      <p className={s.invalid} role="alert">
        Enter a number such as 0.1, -2.5 or 1e-8 to see its bits.
      </p>
    );
  const int8 = result.int8!;
  return (
    <VizFrame
      title="Bit layouts"
      caption={`${state.text} as each format stores it (s is the sign bit). FP16 and BF16 are converted from the FP32 value, as PyTorch does with a float32 tensor.`}
      table={
        <VizTable
          caption="Bit layouts"
          columns={['Format', 'Sign', 'Exponent', 'Mantissa', 'Hex', 'Stored value', 'Largest finite']}
          rows={[
            ...result.rows.map((r) => [
              r.format.label,
              r.fields.sign,
              r.fields.exponent,
              r.fields.mantissa,
              r.hex,
              shown(r.enc.value),
              String(formatRange(r.format).max),
            ]),
            ['INT8', '', '', int8.bits, '', formatNumber(int8.value), formatNumber(127 * state.scale)],
          ]}
        />
      }
    >
      <ol className={s.rows}>
        {result.rows.map((r) => (
          <li key={r.format.id} className={s.row} data-format={r.format.id}>
            <span className={s.name}>
              {r.format.label}
              <span className={s.meta}>
                1 + {r.format.exponentBits} + {r.format.mantissaBits} bits · 0x{r.hex}
              </span>
            </span>
            <Bits fields={r.fields} name={r.format.label} />
            <span className={s.value} data-stored>
              {shown(r.enc.value)}
            </span>
            <span className={s.decode}>{decode(r)}</span>
          </li>
        ))}
        <li className={s.row} data-format="int8">
          <span className={s.name}>
            INT8
            <span className={s.meta}>8 bits, two’s complement · scale {formatNumber(state.scale)}</span>
          </span>
          <Bits fields={{ integer: int8.bits }} name="INT8" />
          <span className={s.value} data-stored>
            {formatNumber(int8.value)}
          </span>
          <span className={s.decode}>
            q = round({state.text} / {formatNumber(state.scale)}) = {int8.q}
            {int8.clipped ? ', clipped to the range −128…127' : ''}; back: {int8.q} ×{' '}
            {formatNumber(state.scale)} = {formatNumber(int8.value)}
          </span>
        </li>
      </ol>
    </VizFrame>
  );
}

import type { ExperimentDef, ReadoutItem, Trace, TraceStep } from '../types';
import { float, floatRepr, pyPrint, typeName, traceVars, type Py } from './pyValues';

/** The program the python-basics step-through walks. Slots come from the experiment state. */
export const BASICS_SOURCE = `item = "{{item}}"
price = {{price}}
quantity = {{quantity}}
total = price * quantity
label = item + " x" + str(quantity)
print(label, "costs", total)
print(type(price), type(quantity), type(total))`;

export interface BasicsState {
  item: string;
  price: number;
  quantity: number;
}

export const ITEM_MAX = 20;
export const PRICE_LIMITS = { min: 0.5, max: 20, step: 0.5 } as const;
export const QUANTITY_LIMITS = { min: 1, max: 12 } as const;

/** Letters and spaces only, so the text is a valid Python string literal as typed. */
export const cleanItem = (s: string) => s.replace(/[^A-Za-z ]/g, '').slice(0, ITEM_MAX);

export const basicsSlots = (s: BasicsState): Record<string, string> => ({
  item: cleanItem(s.item),
  price: floatRepr(s.price),
  quantity: String(s.quantity),
});

const cls = (v: Py) => `<class '${typeName(v)}'>`;

/** The two lines the program prints. */
export function basicsOutput(s: BasicsState): string[] {
  const price = float(s.price);
  const total = float(s.price * s.quantity);
  const label = `${cleanItem(s.item)} x${s.quantity}`;
  return [pyPrint(label, 'costs', total), [price, s.quantity, total].map(cls).join(' ')];
}

/** One step per line, with the variables after it, as Python's tracer records them (tested against CPython). */
export function buildBasicsTrace(s: BasicsState): Trace {
  const item = cleanItem(s.item);
  const total = s.price * s.quantity;
  const label = `${item} x${s.quantity}`;
  const out = basicsOutput(s);
  const vars: Record<string, Py> = {};
  const steps: TraceStep[] = [];
  const step = (line: number, note: string, set?: [string, Py]) => {
    if (set) vars[set[0]] = set[1];
    steps.push({ range: { line }, vars: traceVars(vars), note });
  };
  step(1, `item now names the str "${item}". Quotes make a string; they are not part of the text.`, [
    'item',
    item,
  ]);
  step(
    2,
    `price is the float ${floatRepr(s.price)}. A number with a decimal point is a float, even when it is whole.`,
    ['price', float(s.price)],
  );
  step(3, `quantity is the int ${s.quantity}: a whole number, written without a decimal point.`, [
    'quantity',
    s.quantity,
  ]);
  step(
    4,
    `price * quantity = ${floatRepr(s.price)} · ${s.quantity} = ${floatRepr(total)}. A float times an int gives a float.`,
    ['total', float(total)],
  );
  step(
    5,
    `str(quantity) turns ${s.quantity} into the text "${s.quantity}", so + can join three strings: "${label}".`,
    ['label', label],
  );
  step(6, `print writes its values separated by spaces: ${out[0]}`);
  step(7, `type(...) tells you what kind of value a name refers to: ${out[1]}`);
  return { source: 'computed', steps };
}

export function basicsReadout(s: BasicsState): ReadoutItem[] {
  const [line1, line2] = basicsOutput(s);
  return [
    { label: 'Printed line 1', value: line1! },
    { label: 'Printed line 2', value: line2! },
    {
      label: 'total = price * quantity',
      value: `${floatRepr(s.price)} · ${s.quantity} = ${floatRepr(s.price * s.quantity)}`,
    },
  ];
}

export function basicsExperiment(
  id: string,
  initial: BasicsState,
  traceExample: string,
): ExperimentDef<BasicsState, string[]> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'text',
        id: 'item',
        label: 'item (letters and spaces)',
        maxLength: ITEM_MAX,
        get: (s) => s.item,
        set: (s, v) => ({ ...s, item: cleanItem(v) }),
      },
      {
        kind: 'slider',
        id: 'price',
        label: 'price',
        ...PRICE_LIMITS,
        format: floatRepr,
        get: (s) => s.price,
        set: (s, v) => ({ ...s, price: v }),
      },
      {
        kind: 'slider',
        id: 'quantity',
        label: 'quantity',
        ...QUANTITY_LIMITS,
        get: (s) => s.quantity,
        set: (s, v) => ({ ...s, quantity: v }),
      },
    ],
    compute: basicsOutput,
    trace: buildBasicsTrace,
    traceExample,
    readout: basicsReadout,
  };
}

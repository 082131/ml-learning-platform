// Code for "Time series with pandas". Runnable examples were run with CPython 3.13 and pandas 3.0 and their
// output copied; content/tracks/python/python-outputs.test.ts re-runs them. The window explorer was recorded
// by src/lib/pycourse/fixtures/rolling.py.
import { span } from '@/lib/foundations/annotate';
import { recordedExperiment, recordedSlots, type RecordedFixture } from '@/lib/pycourse/recorded';
import fixture from '@/lib/pycourse/fixtures/rolling.json';
import type { CodeExample } from '@/lib/types';

const rolling = fixture as RecordedFixture;
const SRC = rolling.template;

export const experiment = recordedExperiment('py-rolling', rolling, 'Window or shift');

export const rollingCode: CodeExample = {
  id: 'py-rolling-code',
  language: 'python',
  source: SRC,
  slots: recordedSlots(rolling),
  annotations: [
    {
      id: 'range',
      ...span(SRC, 5, 'pd.date_range("2026-03-02", periods=7, freq="D")'),
      kind: 'function',
      title: 'A daily DatetimeIndex',
      what: 'Seven consecutive days starting Monday 2 March 2026.',
      why: 'With dates as the index, shifts and windows follow the calendar order of the rows.',
      output: '7 timestamps',
    },
    {
      id: 'op',
      ...span(SRC, 7, '{{op}}'),
      kind: 'function',
      title: 'Shift or window',
      what: 'shift(k) moves values k rows later (negative k: earlier). rolling(n) looks at the n rows ending at each row; center=True puts the row in the middle of the window. expanding() looks at everything so far.',
      why: 'Windows that end at the current row use the present and the past. Anything centered or shifted by a negative amount reads the future.',
      inputs: 'the operation chosen above',
    },
  ],
};

/** Parsing timestamps, resampling to days and weeks, and selecting a day by string. */
export const resampleRunner: CodeExample = {
  id: 'py-timeseries-resample',
  language: 'python',
  run: 'pyodide',
  source: `import pandas as pd

events = pd.DataFrame({
    "ts": ["2026-03-02 08:15", "2026-03-02 17:40", "2026-03-03 09:05",
           "2026-03-05 12:00", "2026-03-05 12:30", "2026-03-09 07:45"],
    "amount": [20, 35, 15, 50, 10, 40],
})
events["ts"] = pd.to_datetime(events["ts"])
events = events.set_index("ts").sort_index()

daily = events["amount"].resample("D").sum()
print(daily)
print(events["amount"].resample("W-SUN").agg(["sum", "count"]))
print(events.loc["2026-03-05", "amount"].tolist())`,
  annotations: [],
  expectedOutput: `ts
2026-03-02    55
2026-03-03    15
2026-03-04     0
2026-03-05    60
2026-03-06     0
2026-03-07     0
2026-03-08     0
2026-03-09    40
Freq: D, Name: amount, dtype: int64
            sum  count
ts                    
2026-03-08  130      5
2026-03-15   40      1
[50, 10]`,
};

/** Finding a gap with asfreq, then forward fill versus time interpolation. */
export const gapsRunner: CodeExample = {
  id: 'py-timeseries-gaps',
  language: 'python',
  run: 'pyodide',
  source: `import pandas as pd

temps = pd.Series(
    [4.0, 5.0, None, None, 8.0, 7.5],
    index=pd.to_datetime(["2026-01-01 00:00", "2026-01-01 01:00", "2026-01-01 02:00",
                          "2026-01-01 03:00", "2026-01-01 04:00", "2026-01-01 06:00"]),
)
full = temps.asfreq("h")                     # adds the missing 05:00 row as NaN
print(full.isna().sum(), len(temps), len(full))
print(full.ffill().tolist())
print(full.interpolate(method="time").tolist())`,
  annotations: [],
  expectedOutput: `3 6 7
[4.0, 5.0, 5.0, 5.0, 8.0, 8.0, 7.5]
[4.0, 5.0, 6.0, 7.0, 8.0, 7.75, 7.5]`,
};

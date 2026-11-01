// Code for the data quality lesson. checks.py is pure Python; its output for every setting was produced with
// CPython 3.13.18 (quality.test.ts checks the browser's checks against it). The pytest run used pytest 9.2.0;
// the output shown is from that run (the timing varies). The dbt tests follow the dbt 1.8+ documentation and
// are not run here.
import { QUALITY_SOURCE, qualityExperiment, qualitySlots, type QualityState } from '@/lib/data/quality';
import type { CodeExample } from '@/lib/types';

export const quality = qualityExperiment('quality');

const st = (s: unknown) => s as QualityState;

export const checksPython: CodeExample = {
  id: 'checks-python',
  language: 'python',
  source: QUALITY_SOURCE,
  slots: {
    incident: (s) => qualitySlots(st(s)).incident,
    tolerance: (s) => qualitySlots(st(s)).tolerance,
  },
  annotations: [
    {
      id: 'history',
      range: { line: 4 },
      kind: 'variable',
      title: 'HISTORY',
      what: 'Row counts of the last 7 daily loads.',
      why: 'A volume check compares today with recent history, not with a fixed number, so it follows growth and weekly patterns.',
    },
    {
      id: 'incident',
      range: { line: 16, startCol: 12, endCol: 24 },
      match: '{{incident}}',
      kind: 'parameter',
      title: 'INCIDENT',
      what: 'Which scripted problem today’s load has, from the controls.',
      why: 'Each incident is a real failure pattern: a stalled source, a partial load, a broken field, a renamed column.',
    },
    {
      id: 'tolerance',
      range: { line: 17, startCol: 12, endCol: 25 },
      match: '{{tolerance}}',
      kind: 'parameter',
      title: 'TOLERANCE',
      what: 'How far today’s row count may drift from the median before the volume check fails.',
      why: 'Too tight and normal quiet days raise alarms that people learn to ignore; too loose and a half-empty load passes.',
    },
    {
      id: 'median',
      range: { line: 20 },
      kind: 'math',
      title: 'median(HISTORY)',
      what: 'The middle of the 7 counts: 1003.',
      why: 'The median ignores one unusual day (the 870), where an average would be pulled down by it.',
    },
    {
      id: 'schema',
      range: { line: 25 },
      kind: 'syntax',
      title: 'Schema check (blocks)',
      what: 'Compares today’s columns with the expected ones and lists what is missing or new.',
      why: 'A renamed column breaks every query that uses it. Better to stop here than to load NULLs into amount.',
    },
    {
      id: 'unique',
      range: { line: 26 },
      kind: 'syntax',
      title: 'Uniqueness (blocks)',
      what: 'order_id must not repeat.',
      why: 'Duplicates double-count revenue in every report downstream; there is no safe way to publish them.',
    },
    {
      id: 'freshness',
      range: { line: 28 },
      kind: 'syntax',
      title: 'Freshness (warns)',
      what: 'The newest order must be at most 26 hours old: a daily feed plus some slack.',
      why: 'A source can stop sending without any error: the pipeline happily reloads the same old data. Only freshness notices.',
    },
    {
      id: 'volume',
      range: { line: 29 },
      kind: 'math',
      title: 'Volume (warns)',
      what: 'Today’s rows compared with the median: 902 / 1003 − 1 = −10.1%.',
      why: 'A partial load or a broken filter shows up as a drop in rows long before anyone notices the numbers.',
    },
    {
      id: 'decision',
      range: { line: 35 },
      kind: 'syntax',
      title: 'Block or warn',
      what: 'Any failed blocking check stops publishing; failed warnings publish and alert.',
      why: 'Stopping keeps wrong numbers out of reports, but makes them stale. Use it for failures that make the data wrong, not merely unusual.',
    },
  ],
};

export const pytestRun: CodeExample = {
  id: 'pytest-transform',
  language: 'python',
  source: `# transform.py
def clean_order(raw):
    """Turns one raw CSV row (all strings) into a typed order."""
    return {
        "order_id": int(raw["order_id"]),
        "email": raw["email"].strip().lower(),
        "amount": round(float(raw["amount"]), 2),
        "country": raw["country"].upper(),
    }


# test_transform.py
import pytest

from transform import clean_order

RAW = {"order_id": "1001", "email": " Ada@Example.com ", "amount": "30.004", "country": "gb"}


def test_types_and_normalization():
    assert clean_order(RAW) == {"order_id": 1001, "email": "ada@example.com", "amount": 30.0, "country": "GB"}


def test_decimal_comma_is_rejected():
    with pytest.raises(ValueError):
        clean_order({**RAW, "amount": "12,50"})


def test_country_is_two_letters():
    assert len(clean_order({**RAW, "country": "uk"})["country"]) == 2`,
  annotations: [
    {
      id: 'unit',
      range: { line: 2 },
      kind: 'function',
      title: 'A pure transform',
      what: 'Takes a row, returns a row: no database, no files.',
      why: 'Pure functions are easy to unit-test with a few hand-written rows. Keep pipeline I/O at the edges.',
    },
    {
      id: 'normalize',
      range: { line: 20 },
      kind: 'syntax',
      title: 'Test the normal case exactly',
      what: 'Asserts the whole output row: types, trimmed lower-case email, rounding, upper-case country.',
      why: 'Comparing the whole dict catches any field that changes, not just the one you were thinking about.',
    },
    {
      id: 'raises',
      range: { line: 25 },
      kind: 'framework',
      title: 'pytest.raises(ValueError)',
      what: 'The test passes only if the call raises ValueError.',
      why: 'Testing failure paths documents what the transform refuses, so validation upstream knows what it must catch.',
    },
    {
      id: 'weak',
      range: { line: 29 },
      kind: 'syntax',
      title: 'A weak test',
      what: 'Checks that the country has two letters.',
      why: 'It passes for "UK", which is not a valid ISO code (Britain is GB). A test is only as good as what it asserts; a data test against an allowed list would catch it.',
    },
  ],
  expectedOutput: `$ pytest -q
...                                                                      [100%]
3 passed in 0.01s`,
};

export const dbtTests: CodeExample = {
  id: 'dbt-tests',
  language: 'bash',
  source: `# models/schema.yml (dbt): data tests that run against the warehouse table after every build
models:
  - name: orders_clean
    columns:
      - name: order_id
        data_tests: [unique, not_null]
      - name: country
        data_tests:
          - accepted_values:
              values: ['GB', 'US', 'NO', 'DE', 'FR']
      - name: amount
        data_tests: [not_null]

# models/sources.yml: freshness of the raw source
sources:
  - name: shop
    loaded_at_field: _loaded_at
    freshness:
      warn_after: {count: 26, period: hour}
      error_after: {count: 48, period: hour}
    tables:
      - name: orders_raw`,
  annotations: [
    {
      id: 'unique',
      range: { line: 6 },
      kind: 'framework',
      title: 'unique, not_null',
      what: 'Built-in data tests: dbt generates a SQL query that returns the offending rows, and the test fails if any come back.',
      why: 'The same uniqueness check as the lesson’s Python, declared next to the model instead of written by hand.',
    },
    {
      id: 'accepted',
      range: { line: 9 },
      kind: 'framework',
      title: 'accepted_values',
      what: 'Every country must be in the list.',
      why: 'This is the test that catches "UK", which the two-letter unit test let through.',
    },
    {
      id: 'freshness',
      range: { line: 18 },
      kind: 'framework',
      title: 'freshness: warn_after / error_after',
      what: 'Warns when the newest _loaded_at is over 26 hours old and errors after 48.',
      why: 'Two thresholds express the block-or-warn decision: a late feed is first a warning, then a failure.',
    },
  ],
};

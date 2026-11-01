// Code for the ingestion lesson. ingest.py is pure Python; its output for every setting was produced with
// CPython 3.13.18 (ingest.test.ts checks the browser's simulation against that run). The schema check runs
// in the browser and its expected output is checked under CPython by python-outputs.test.ts. The requests
// client follows the requests 2.32 documentation and is not run here (it needs a real API).
import { INGEST_SOURCE, ingestExperiment, ingestSlots, type IngestState } from '@/lib/data/ingest';
import type { CodeExample } from '@/lib/types';

export const ingest = ingestExperiment('ingest');

const st = (s: unknown) => s as IngestState;

export const ingestPython: CodeExample = {
  id: 'ingest-python',
  language: 'python',
  source: INGEST_SOURCE,
  slots: {
    pageSize: (s) => ingestSlots(st(s)).pageSize,
    retries: (s) => ingestSlots(st(s)).retries,
    fault: (s) => ingestSlots(st(s)).fault,
    mode: (s) => ingestSlots(st(s)).mode,
  },
  annotations: [
    {
      id: 'get-page',
      range: { line: 13 },
      kind: 'function',
      title: 'def get_page(page)',
      what: 'Plays the API: returns a status code and a JSON-like body with one page of records and the next page number.',
      why: 'A stand-in makes failures repeatable. A real job calls requests.get with the same parameters.',
    },
    {
      id: 'next-page',
      range: { line: 22 },
      kind: 'variable',
      title: '"next_page"',
      what: 'The API says where to continue, or None after the last page.',
      why: 'Follow the API’s own pointer until it runs out instead of guessing how many pages there are.',
    },
    {
      id: 'upsert',
      range: { line: 27 },
      kind: 'syntax',
      title: 'Upsert',
      what: 'Before adding a row, removes any row with the same id.',
      why: 'Writing the same record twice leaves one copy, so the job can be rerun safely. Databases do this with MERGE or INSERT ... ON CONFLICT.',
    },
    {
      id: 'retry-loop',
      range: { line: 36 },
      kind: 'syntax',
      title: 'for attempt in range(MAX_RETRIES + 1)',
      what: 'One first try plus up to MAX_RETRIES retries for the same page.',
      why: 'Temporary failures (429, 503, timeouts) usually pass. Retrying a bounded number of times turns them into a short delay instead of a failed job.',
    },
    {
      id: 'give-up',
      range: { line: 40 },
      kind: 'syntax',
      title: 'raise when the retries run out',
      what: 'Stops the job with a clear message once the last attempt fails.',
      why: 'Retrying forever hides a real outage. Failing loudly lets the orchestrator alert someone and retry the job later.',
    },
    {
      id: 'backoff',
      range: { line: 42 },
      kind: 'math',
      title: 'body.get("retry_after", 2 ** attempt)',
      what: 'Waits as long as the server asked (Retry-After), otherwise 1, 2, 4 ... seconds: exponential backoff.',
      why: 'Hammering a struggling server makes it worse. Each wait doubles, so a short blip costs little and a long outage is not flooded.',
    },
    {
      id: 'crash',
      range: { line: 47 },
      kind: 'syntax',
      title: 'A crash after a write',
      what: 'Simulates the worker dying after page 3 was written but before the job finished.',
      why: 'The job did not record how far it got, so it starts again from page 1. Only an idempotent write survives that without duplicates.',
    },
    {
      id: 'rerun',
      range: { line: 53 },
      kind: 'syntax',
      title: 'for run in (1, 2)',
      what: 'Runs the job, and runs it once more if the worker crashed.',
      why: 'This is what an orchestrator does when a task dies: it starts the task again from the beginning.',
    },
  ],
};

export const schemaRunner: CodeExample = {
  id: 'schema-runner',
  language: 'python',
  run: 'pyodide',
  source: `import csv
import io
import json

EXPECTED = {"id": int, "amount": float, "country": str}

csv_text = "id,amount,country\\n1,30.0,GB\\n2,12.5,US\\n"
json_text = '[{"id": 3, "amount": 8.25, "country": "NO", "coupon": "AUTUMN"}]'

rows_csv = list(csv.DictReader(io.StringIO(csv_text)))
rows_json = json.loads(json_text)
print(rows_csv[0])
print(rows_json[0])


def schema_problems(row):
    problems = []
    for col, typ in EXPECTED.items():
        if col not in row:
            problems.append(f"missing {col}")
        elif not isinstance(row[col], typ):
            problems.append(f"{col} is {type(row[col]).__name__}, expected {typ.__name__}")
    extra = sorted(set(row) - set(EXPECTED))
    if extra:
        problems.append(f"new columns {extra}")
    return problems


print(schema_problems(rows_csv[0]))
print(schema_problems(rows_json[0]))`,
  annotations: [],
  expectedOutput: `{'id': '1', 'amount': '30.0', 'country': 'GB'}
{'id': 3, 'amount': 8.25, 'country': 'NO', 'coupon': 'AUTUMN'}
['id is str, expected int', 'amount is str, expected float']
["new columns ['coupon']"]`,
};

export const requestsClient: CodeExample = {
  id: 'requests-client',
  language: 'python',
  source: `import time

import requests

URL = "https://api.example.com/v1/orders"
session = requests.Session()


def fetch_all(updated_since, page_size=100, max_retries=4):
    params = {"updated_since": updated_since, "per_page": page_size, "page": 1}
    while True:
        for attempt in range(max_retries + 1):
            resp = session.get(URL, params=params, timeout=10)
            if resp.status_code not in (429, 500, 502, 503, 504):
                break
            if attempt == max_retries:
                resp.raise_for_status()
            time.sleep(float(resp.headers.get("Retry-After", 2 ** attempt)))
        resp.raise_for_status()  # 400, 401, 404 ...: retrying will not help
        body = resp.json()
        yield from body["data"]
        if body.get("next_page") is None:
            return
        params["page"] = body["next_page"]`,
  annotations: [
    {
      id: 'session',
      range: { line: 6 },
      kind: 'framework',
      title: 'requests.Session()',
      what: 'Reuses one connection for every page.',
      why: 'Opening a new TLS connection per request is slow; a session keeps it alive.',
    },
    {
      id: 'since',
      range: { line: 10 },
      kind: 'parameter',
      title: '"updated_since"',
      what: 'Asks only for records changed after the last successful run: an incremental load.',
      why: 'Re-downloading everything every night gets slower as the data grows. Incremental loads plus an upsert stay fast and correct.',
    },
    {
      id: 'timeout',
      range: { line: 13 },
      kind: 'parameter',
      title: 'timeout=10',
      what: 'Gives up on a request that has not answered in 10 seconds.',
      why: 'requests waits forever by default. One hung connection would stall the whole pipeline.',
    },
    {
      id: 'retryable',
      range: { line: 14 },
      kind: 'syntax',
      title: 'Which statuses to retry',
      what: '429 (too many requests) and 5xx server errors are usually temporary, so they are retried.',
      why: 'A 400 or 401 means the request itself is wrong; sending it again gets the same answer.',
    },
    {
      id: 'yield',
      range: { line: 21 },
      kind: 'syntax',
      title: 'yield from body["data"]',
      what: 'Hands out records one page at a time instead of building one huge list.',
      why: 'Memory use stays flat however many pages the API has; the caller can write each page as it arrives.',
    },
  ],
};

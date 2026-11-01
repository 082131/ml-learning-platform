/**
 * The ingestion lesson's paginated API job, computed in the browser: pages of a fixed record set, scripted
 * faults (a rate limit, a flaky page, a crash after a write), retries with exponential backoff, and append
 * vs upsert writes. ingest.test.ts checks every setting against INGEST_SOURCE run with CPython 3.13.
 */
import type { ExperimentDef } from '../types';

export type Fault = 'none' | 'rate-limit' | 'flaky' | 'crash';
export type WriteMode = 'append' | 'upsert';

export interface IngestState {
  pageSize: number;
  fault: Fault;
  mode: WriteMode;
  retries: number;
}

export const RECORD_COUNT = 23;
export const RETRIES_MAX = 3;

/** One line of the job's log, in the order the Python prints them. */
export type IngestEvent =
  | { kind: 'retry'; run: number; page: number; status: number; wait: number }
  | { kind: 'write'; run: number; page: number; rows: number }
  | { kind: 'crash'; run: number }
  | { kind: 'failed'; run: number; page: number; status: number; attempt: number };

export interface IngestRun {
  events: IngestEvent[];
  /** The ids in the destination table, in table order. */
  table: number[];
  waited: number;
  succeeded: boolean;
}

export function simulateIngest({ pageSize, fault, mode, retries }: IngestState): IngestRun {
  const calls = new Map<number, number>();
  let crashesLeft = fault === 'crash' ? 1 : 0;
  let table: number[] = [];
  let waited = 0;
  const events: IngestEvent[] = [];

  const getPage = (page: number) => {
    const n = (calls.get(page) ?? 0) + 1;
    calls.set(page, n);
    if (page === 2 && fault === 'rate-limit' && n === 1) return { status: 429, retryAfter: 2 };
    if (page === 2 && fault === 'flaky' && n <= 2) return { status: 503 };
    const start = (page - 1) * pageSize;
    const ids = Array.from(
      { length: Math.max(0, Math.min(pageSize, RECORD_COUNT - start)) },
      (_, i) => start + i + 1,
    );
    return { status: 200, ids, next: start + pageSize < RECORD_COUNT ? page + 1 : null };
  };
  const write = (ids: number[]) => {
    for (const id of ids) {
      if (mode === 'upsert') table = table.filter((t) => t !== id);
      table.push(id);
    }
  };

  /** Returns 'ok', 'crash' or 'failed', like run_job returning or raising. */
  const runJob = (run: number): 'ok' | 'crash' | 'failed' => {
    let page: number | null = 1;
    while (page !== null) {
      let body: ReturnType<typeof getPage> | null = null;
      for (let attempt = 0; attempt <= retries; attempt++) {
        const res = getPage(page);
        if (res.status === 200) {
          body = res;
          break;
        }
        if (attempt === retries) {
          events.push({ kind: 'failed', run, page, status: res.status, attempt: attempt + 1 });
          return 'failed';
        }
        const wait = res.retryAfter ?? 2 ** attempt;
        events.push({ kind: 'retry', run, page, status: res.status, wait });
        waited += wait;
      }
      const ids = body!.ids!;
      write(ids);
      events.push({ kind: 'write', run, page, rows: ids.length });
      if (crashesLeft && page === 3) {
        crashesLeft -= 1;
        events.push({ kind: 'crash', run });
        return 'crash';
      }
      page = body!.next ?? null;
    }
    return 'ok';
  };

  let succeeded = false;
  for (const run of [1, 2]) {
    const r = runJob(run);
    if (r === 'ok') {
      succeeded = true;
      break;
    }
    if (r === 'failed') break;
  }
  return { events, table, waited, succeeded };
}

export function eventLine(e: IngestEvent, retries: number): string {
  switch (e.kind) {
    case 'retry':
      return `page ${e.page}: ${e.status}, retry in ${e.wait}s`;
    case 'write':
      return `page ${e.page}: 200, wrote ${e.rows} rows`;
    case 'crash':
      return `run ${e.run} crashed (worker lost after writing page 3), starting again from page 1`;
    case 'failed':
      return `job failed: gave up on page ${e.page}: status ${e.status} on attempt ${e.attempt} of ${retries + 1}`;
  }
}

/** What INGEST_SOURCE prints. */
export function ingestPrintout(r: IngestRun, retries: number): string {
  const distinct = new Set(r.table).size;
  return [
    ...r.events.map((e) => eventLine(e, retries)),
    `rows: ${r.table.length}, distinct ids: ${distinct}, waited ${r.waited}s`,
  ].join('\n');
}

/** How many copies of each id the table holds (index 0 is id 1). */
export function idCounts(r: IngestRun): number[] {
  const counts = Array.from({ length: RECORD_COUNT }, () => 0);
  for (const id of r.table) counts[id - 1]! += 1;
  return counts;
}

export const INGEST_SOURCE = `RECORDS = [{"id": i, "amount": i * 10} for i in range(1, 24)]  # what the API holds
PAGE_SIZE = {{pageSize}}
MAX_RETRIES = {{retries}}
FAULT = "{{fault}}"  # none, rate-limit, flaky or crash
MODE = "{{mode}}"  # append or upsert

calls = {}  # page -> requests so far
crashes_left = 1 if FAULT == "crash" else 0
table = []
waited = 0


def get_page(page):
    # A stand-in for GET /orders?page=N&per_page=PAGE_SIZE. Returns (status, body).
    calls[page] = calls.get(page, 0) + 1
    if page == 2 and FAULT == "rate-limit" and calls[page] == 1:
        return 429, {"retry_after": 2}
    if page == 2 and FAULT == "flaky" and calls[page] <= 2:
        return 503, {}
    start = (page - 1) * PAGE_SIZE
    more = start + PAGE_SIZE < len(RECORDS)
    return 200, {"data": RECORDS[start:start + PAGE_SIZE], "next_page": page + 1 if more else None}


def write(rows):
    for row in rows:
        if MODE == "upsert":  # replace the row with the same id, if there is one
            table[:] = [r for r in table if r["id"] != row["id"]]
        table.append(row)


def run_job():
    global crashes_left, waited
    page = 1
    while page is not None:
        for attempt in range(MAX_RETRIES + 1):
            status, body = get_page(page)
            if status == 200:
                break
            if attempt == MAX_RETRIES:
                raise RuntimeError(f"gave up on page {page}: status {status} on attempt {attempt + 1} of {MAX_RETRIES + 1}")
            wait = body.get("retry_after", 2 ** attempt)  # the server's hint, else exponential backoff
            print(f"page {page}: {status}, retry in {wait}s")
            waited += wait  # a real job calls time.sleep(wait)
        write(body["data"])
        print(f"page {page}: 200, wrote {len(body['data'])} rows")
        if crashes_left and page == 3:
            crashes_left -= 1
            raise ConnectionError("worker lost after writing page 3")
        page = body["next_page"]


for run in (1, 2):
    try:
        run_job()
        break
    except ConnectionError as e:
        print(f"run {run} crashed ({e}), starting again from page 1")
    except RuntimeError as e:
        print(f"job failed: {e}")
        break

ids = [r["id"] for r in table]
print(f"rows: {len(ids)}, distinct ids: {len(set(ids))}, waited {waited}s")`;

export const ingestSlots = (s: IngestState) => ({
  pageSize: String(s.pageSize),
  retries: String(s.retries),
  fault: s.fault,
  mode: s.mode,
});

export function ingestExperiment(id: string): ExperimentDef<IngestState, IngestRun> {
  return {
    id,
    initial: { pageSize: 5, fault: 'flaky', mode: 'append', retries: 2 },
    controls: [
      {
        kind: 'select',
        id: 'fault',
        label: 'What goes wrong',
        options: [
          { value: 'none', label: 'Nothing' },
          { value: 'rate-limit', label: 'Page 2 is rate limited once (429, retry after 2 s)' },
          { value: 'flaky', label: 'Page 2 fails twice (503)' },
          { value: 'crash', label: 'The worker crashes after writing page 3' },
        ],
        get: (s) => s.fault,
        set: (s, v) => ({ ...s, fault: v as Fault }),
      },
      {
        kind: 'slider',
        id: 'retries',
        label: 'Retries per page',
        min: 0,
        max: RETRIES_MAX,
        get: (s) => s.retries,
        set: (s, v) => ({ ...s, retries: v }),
      },
      {
        kind: 'select',
        id: 'mode',
        label: 'How rows are written',
        options: [
          { value: 'append', label: 'Append (insert every row)' },
          { value: 'upsert', label: 'Upsert by id (insert or replace)' },
        ],
        get: (s) => s.mode,
        set: (s, v) => ({ ...s, mode: v as WriteMode }),
      },
      {
        kind: 'select',
        id: 'pageSize',
        label: 'Page size',
        options: [
          { value: '5', label: '5 records per page' },
          { value: '10', label: '10 records per page' },
        ],
        get: (s) => String(s.pageSize),
        set: (s, v) => ({ ...s, pageSize: Number(v) }),
      },
    ],
    compute: simulateIngest,
    readout: (s, r) => {
      const distinct = new Set(r.table).size;
      const dupes = r.table.length - distinct;
      return [
        { label: 'Python: what ingest.py prints', value: ingestPrintout(r, s.retries) },
        {
          label: 'Outcome',
          value: r.succeeded
            ? `all ${RECORD_COUNT} records loaded${dupes ? `, plus ${dupes} duplicate rows` : ', no duplicates'}`
            : `job failed with ${distinct} of ${RECORD_COUNT} records loaded`,
          status: r.succeeded && !dupes ? 'ok' : 'error',
        },
      ];
    },
  };
}

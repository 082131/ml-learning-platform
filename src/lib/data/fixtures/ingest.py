# Generates ingest-python.json: what the ingestion lesson's Python prints for every page size, fault,
# write mode and retry limit the lesson offers. Run: python3 src/lib/data/fixtures/ingest.py
import contextlib, io, json, pathlib

SOURCE = """RECORDS = [{"id": i, "amount": i * 10} for i in range(1, 24)]  # what the API holds
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
print(f"rows: {len(ids)}, distinct ids: {len(set(ids))}, waited {waited}s")"""

out = {}
for page_size in (5, 10):
    for fault in ("none", "rate-limit", "flaky", "crash"):
        for mode in ("append", "upsert"):
            for retries in range(0, 4):
                code = (SOURCE.replace("{{pageSize}}", str(page_size)).replace("{{retries}}", str(retries))
                        .replace("{{fault}}", fault).replace("{{mode}}", mode))
                buf = io.StringIO()
                with contextlib.redirect_stdout(buf):
                    exec(code, {})
                out[f"{page_size},{fault},{mode},{retries}"] = buf.getvalue().rstrip("\n")
pathlib.Path(__file__).with_name("ingest-python.json").write_text(json.dumps(out, indent=1) + "\n")

# Generates quality-python.json: what the data quality lesson's Python prints for every incident and volume
# tolerance the lesson offers. Run: python3 src/lib/data/fixtures/quality.py
import contextlib, io, json, pathlib

SOURCE = """from statistics import median

EXPECTED_COLUMNS = ["order_id", "email", "amount", "country", "ordered_at"]
HISTORY = [980, 1012, 1003, 995, 1040, 870, 1021]  # rows loaded on each of the last 7 days
NORMAL = {"rows": 902, "lag_hours": 3, "null_email": 0.004, "negative": 0, "duplicates": 0,
          "columns": EXPECTED_COLUMNS}
INCIDENTS = {
    "none": {},
    "late": {"lag_hours": 30},
    "volume": {"rows": 412},
    "nulls": {"null_email": 0.18},
    "schema": {"columns": ["order_id", "email", "amount_eur", "country", "ordered_at"]},
    "range": {"negative": 27},
    "duplicates": {"duplicates": 14},
}
INCIDENT = "{{incident}}"
TOLERANCE = {{tolerance}}  # allowed change in row count vs the 7-day median

today = {**NORMAL, **INCIDENTS[INCIDENT]}  # metrics of today's load of orders_clean
base = median(HISTORY)
change = today["rows"] / base - 1
missing = sorted(set(EXPECTED_COLUMNS) - set(today["columns"]))
extra = sorted(set(today["columns"]) - set(EXPECTED_COLUMNS))
checks = [  # (name, severity, passed, detail)
    ("schema", "block", not missing and not extra, f"missing {missing}, unexpected {extra}"),
    ("unique", "block", today["duplicates"] == 0, f"{today['duplicates']} duplicate order_id values"),
    ("range", "block", today["negative"] == 0, f"{today['negative']} negative amounts"),
    ("freshness", "warn", today["lag_hours"] <= 26, f"newest order is {today['lag_hours']} h old (limit 26)"),
    ("volume", "warn", abs(change) <= TOLERANCE, f"{today['rows']} rows, {change:+.1%} vs median {base}"),
    ("nulls", "warn", today["null_email"] <= 0.01, f"{today['null_email']:.1%} of emails empty (limit 1.0%)"),
]
for name, severity, passed, detail in checks:
    print(f"{'PASS' if passed else 'FAIL'}  {name:<9} {severity:<5}  {detail}")

if any(not passed and severity == "block" for _, severity, passed, _ in checks):
    print("STOP: downstream tables keep yesterday's data; page the on-call engineer")
elif any(not passed for _, _, passed, _ in checks):
    print("PUBLISH with a warning; alert the data owner")
else:
    print("PUBLISH")"""

TOLERANCES = ["0.05", "0.1", "0.15", "0.2", "0.25", "0.3", "0.35", "0.4", "0.45", "0.5"]
out = {}
for incident in ("none", "late", "volume", "nulls", "schema", "range", "duplicates"):
    for tol in TOLERANCES:
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            exec(SOURCE.replace("{{incident}}", incident).replace("{{tolerance}}", tol), {})
        out[f"{incident},{tol}"] = buf.getvalue().rstrip("\n")
pathlib.Path(__file__).with_name("quality-python.json").write_text(json.dumps(out, indent=1) + "\n")

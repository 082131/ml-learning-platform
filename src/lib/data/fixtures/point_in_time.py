# Generates point-in-time-python.json: what the training-serving lesson's Python prints for every join and
# feature window the lesson offers. Run: python3 src/lib/data/fixtures/point_in_time.py
import contextlib, io, json, pathlib

SOURCE = """ORDERS = {"A": [2, 5, 9, 12, 13, 20], "B": [1, 15, 16, 17, 18], "C": [3, 4, 22]}  # order days
WINDOW = {{window}}  # feature: orders in the last WINDOW days
JOIN = "{{join}}"  # as-of, same-day or latest
LATEST_RUN = 25  # the feature job last ran at the end of day 25


def snapshot(customer, day):  # the value the daily feature job wrote at the end of `day`
    return sum(1 for d in ORDERS[customer] if day - WINDOW < d <= day)


examples = [("A", 10), ("A", 14), ("B", 15), ("B", 19), ("C", 5), ("C", 21)]  # predict at the start of a day
leaks = 0
for customer, day in examples:
    label = int(any(day <= d < day + 7 for d in ORDERS[customer]))  # orders in the next 7 days?
    snap = {"as-of": day - 1, "same-day": day, "latest": LATEST_RUN}[JOIN]
    value, correct = snapshot(customer, snap), snapshot(customer, day - 1)
    note = "" if value == correct else f"  <- from day {snap}; at prediction time it was {correct}"
    leaks += value != correct
    print(f"{customer} day {day:2}: feature={value} label={label}{note}")
print(f"{leaks} of {len(examples)} training rows use information from the future")"""

out = {}
for window in (3, 7):
    for join in ("as-of", "same-day", "latest"):
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            exec(SOURCE.replace("{{window}}", str(window)).replace("{{join}}", join), {})
        out[f"{window},{join}"] = buf.getvalue().rstrip("\n")
pathlib.Path(__file__).with_name("point-in-time-python.json").write_text(json.dumps(out, indent=1) + "\n")

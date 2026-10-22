# Generates stream-python.json: what the batch vs stream lesson's Python prints for every window size
# and allowed lateness the lesson offers. Run: python3 src/lib/data/fixtures/stream.py
import contextlib, io, json, pathlib

SOURCE = """# (event_time, arrival_time) in minutes after 12:00, listed in arrival order.
EVENTS = [(1, 2), (3, 3), (4, 6), (6, 7), (8, 9), (2, 11), (11, 12), (9, 13),
          (13, 14), (14, 16), (17, 18), (19, 20), (7, 21), (22, 23), (24, 25), (26, 27)]
WINDOW = {{window}}  # tumbling windows [0, WINDOW), [WINDOW, 2 * WINDOW), ...
LATENESS = {{lateness}}  # allowed lateness: watermark = max event time seen - LATENESS

counts = {}        # window start -> events counted so far
emitted = {}       # window start -> (count, emitted at)
dropped = []
max_seen = float("-inf")

for event_time, arrival in EVENTS:
    start = event_time // WINDOW * WINDOW
    if start in emitted:
        dropped.append((event_time, arrival))   # its window is already final
    else:
        counts[start] = counts.get(start, 0) + 1
    max_seen = max(max_seen, event_time)
    watermark = max_seen - LATENESS
    for s in sorted(counts):
        if s not in emitted and s + WINDOW <= watermark:
            emitted[s] = (counts[s], arrival)

for s, (count, at) in sorted(emitted.items()):
    print(f"[{s:2}, {s + WINDOW:2}) count={count} emitted at {at:2} (latency {at - s - WINDOW})")
print("still open:", sorted(set(counts) - set(emitted)))
print("dropped as late:", dropped)"""

out = {}
for window in (5, 10):
    for lateness in range(0, 11):
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            exec(SOURCE.replace("{{window}}", str(window)).replace("{{lateness}}", str(lateness)), {})
        out[f"{window},{lateness}"] = buf.getvalue().rstrip("\n")
pathlib.Path(__file__).with_name("stream-python.json").write_text(json.dumps(out, indent=1) + "\n")

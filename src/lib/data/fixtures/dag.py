# Generates dag-python.json: what the orchestration lesson's Python prints for every failing task, number of
# failures and retry setting the lesson offers. Run: python3 src/lib/data/fixtures/dag.py
import contextlib, io, json, pathlib

SOURCE = """TASKS = {  # name: (minutes it runs, upstream tasks), listed in dependency order
    "extract_orders": (2, []),
    "extract_customers": (1, []),
    "validate": (1, ["extract_orders", "extract_customers"]),
    "transform": (3, ["validate"]),
    "load_warehouse": (2, ["transform"]),
    "report": (1, ["load_warehouse"]),
    "features": (2, ["load_warehouse"]),
    "notify": (1, ["report", "features"]),
}
ALL_DONE = {"notify"}  # runs once its upstream tasks finish, whether they succeeded or not
RETRIES = {{retries}}
RETRY_DELAY = 1  # minutes; doubles after each failed attempt
FAILING = "{{failing}}"  # this task fails its first FAILS attempts
FAILS = {{fails}}

state, end = {}, {}
for name, (minutes, upstream) in TASKS.items():
    t = max((end[u] for u in upstream), default=0)
    if name not in ALL_DONE and any(state[u] != "success" for u in upstream):
        state[name], end[name] = "upstream_failed", t
        print(f"{name:<18} upstream_failed")
        continue
    start = t
    for attempt in range(RETRIES + 1):
        t += minutes
        if not (name == FAILING and attempt < FAILS):
            state[name] = "success"
            break
        if attempt < RETRIES:
            t += RETRY_DELAY * 2 ** attempt
    else:
        state[name] = "failed"
    end[name] = t
    print(f"{name:<18} {state[name]:<8} attempts={attempt + 1} start={start:>2} end={t:>2}")

print("run finished at minute", max(end.values()))"""

TASK_NAMES = ["extract_orders", "extract_customers", "validate", "transform", "load_warehouse", "report",
              "features"]
out = {}
for failing in ["none"] + TASK_NAMES:
    for fails in range(1, 5):
        for retries in range(0, 4):
            code = (SOURCE.replace("{{failing}}", failing).replace("{{fails}}", str(fails))
                    .replace("{{retries}}", str(retries)))
            buf = io.StringIO()
            with contextlib.redirect_stdout(buf):
                exec(code, {})
            out[f"{failing},{fails},{retries}"] = buf.getvalue().rstrip("\n")
pathlib.Path(__file__).with_name("dag-python.json").write_text(json.dumps(out, indent=1) + "\n")

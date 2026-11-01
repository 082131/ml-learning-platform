# Generates shuffle-python.json: what the Spark lesson's Python prints for every operation, shuffle partition
# count and skew setting the lesson offers. Run: python3 src/lib/data/fixtures/shuffle.py
import contextlib, io, json, pathlib

SOURCE = """import zlib

OP = "{{op}}"  # filter, sum, join or broadcast
N = {{partitions}}  # shuffle partitions (spark.sql.shuffle.partitions)
SKEW = {{skew}}  # True: customer C1 places 14 of the 24 orders


def customer(i):
    if SKEW:
        return "C1" if i % 12 < 7 else f"C{i % 12 - 5}"
    return f"C{i % 6 + 1}"


orders = [(customer(i), (i * 7) % 50 + 5) for i in range(24)]
inputs = [orders[p * 8:(p + 1) * 8] for p in range(3)]  # 3 files, read as 3 partitions


def target(key):  # which shuffle partition a key goes to
    return zlib.crc32(key.encode()) % N


stage1 = [len(part) for part in inputs]
print(f"stage 1: {len(inputs)} tasks read {stage1} records")
if OP == "filter":  # narrow: every task works on its own partition; nothing moves
    print("kept per task:", [sum(1 for _, amount in part if amount >= 20) for part in inputs])
    stages = [stage1]
elif OP == "broadcast":  # the small customers table is copied to every task instead
    print("each task joins against its own copy of customers (6 rows); nothing moves")
    stages = [stage1]
else:
    moved = []
    for part in inputs:
        if OP == "sum":  # partial sums inside each task before the shuffle
            acc = {}
            for key, amount in part:
                acc[key] = acc.get(key, 0) + amount
            moved += acc.items()
        else:  # join: every order moves to its customer's partition
            moved += part
    outputs = [[] for _ in range(N)]
    for key, value in moved:
        outputs[target(key)].append((key, value))
    stage2 = [len(p) for p in outputs]
    print(f"shuffle: {len(moved)} records to {N} partitions")
    print(f"stage 2: {N} tasks read {stage2} records")
    stages = [stage1, stage2]
print("time:", " + ".join(str(max(s)) for s in stages), "=", sum(max(s) for s in stages),
      "units (each stage waits for its slowest task)")"""

out = {}
for op in ("filter", "sum", "join", "broadcast"):
    for n in range(2, 7):
        for skew in (False, True):
            code = SOURCE.replace("{{op}}", op).replace("{{partitions}}", str(n)).replace("{{skew}}", str(skew))
            buf = io.StringIO()
            with contextlib.redirect_stdout(buf):
                exec(code, {})
            out[f"{op},{n},{skew}"] = buf.getvalue().rstrip("\n")
pathlib.Path(__file__).with_name("shuffle-python.json").write_text(json.dumps(out, indent=1) + "\n")

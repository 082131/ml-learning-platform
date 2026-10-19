# Generates lookup-python.json: the output of LOOKUP_SOURCE for every table size and target in the
# lesson, run with CPython. Run: python3 src/lib/data/fixtures/lookup.py
import json, pathlib

def scan(orders, target):
    touched = 0
    found = []
    for order_id, customer_id in orders:
        touched += 1
        if customer_id == target:
            found.append(order_id)
    return found, touched


def index_lookup(index, target):
    lo, hi = 0, len(index)
    touched = 0
    while lo < hi:
        mid = (lo + hi) // 2
        touched += 1
        if index[mid][0] < target:
            lo = mid + 1
        else:
            hi = mid
    found = []
    while lo < len(index):
        touched += 1
        customer_id, order_id = index[lo]
        if customer_id != target:
            break
        found.append(order_id)
        lo += 1
    return found, touched


results = {}
for n in range(4, 33):
    orders = [(101 + i, (i * 5) % 8 + 1) for i in range(n)]
    index = sorted((c, o) for o, c in orders)
    for target in range(1, 10):
        results[f"{n},{target}"] = [list(scan(orders, target)), list(index_lookup(index, target))]
pathlib.Path(__file__).with_name("lookup-python.json").write_text(json.dumps(results, separators=(",", ":")) + "\n")

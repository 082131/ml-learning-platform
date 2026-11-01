# Generates lake-sizes.json: writes one month of events three ways (CSV, one Parquet file, Parquet partitioned
# by day) in the current directory and records the bytes of every column chunk from the Parquet metadata.
# Run from a scratch directory with pandas 3.0.5 and pyarrow 26.0.0, then copy lake-sizes.json here.
import datetime as dt
import json
import os
import random
import string

import pandas as pd
import pyarrow as pa
import pyarrow.dataset as ds
import pyarrow.parquet as pq

random.seed(7)
DAYS, PER_DAY = 30, 2_000
rows = []
for d in range(DAYS):
    day = dt.date(2026, 10, 1) + dt.timedelta(days=d)
    for i in range(PER_DAY):
        rows.append({
            "event_id": d * PER_DAY + i + 1,
            "user_id": random.randint(1, 5_000),
            "country": random.choice(["GB", "US", "NO", "DE", "FR"]),
            "event_type": random.choice(["view", "click", "cart", "purchase"]),
            "amount": round(random.uniform(0, 200), 2),
            "payload": "".join(random.choices(string.ascii_letters + string.digits, k=40)),
            "day": day,
        })
df = pd.DataFrame(rows)
table = pa.Table.from_pandas(df, preserve_index=False)

df.to_csv("events.csv", index=False)
pq.write_table(table, "events.parquet")
ds.write_dataset(table, "events", format="parquet", partitioning=["day"], partitioning_flavor="hive",
                 basename_template="part-{i}.parquet")


def column_bytes(path):
    meta = pq.ParquetFile(path).metadata
    out = {}
    for rg in range(meta.num_row_groups):
        for c in range(meta.num_columns):
            col = meta.row_group(rg).column(c)
            out[col.path_in_schema] = out.get(col.path_in_schema, 0) + col.total_compressed_size
    return out, os.path.getsize(path), meta.num_row_groups


single, single_size, groups = column_bytes("events.parquet")
parts = {}
for d in sorted(os.listdir("events")):
    cols, size, _ = column_bytes(f"events/{d}/part-0.parquet")
    parts[d.split("=")[1]] = {"columns": cols, "file": size}
manifest = {
    "rows": len(df),
    "csv": os.path.getsize("events.csv"),
    "single": {"columns": single, "file": single_size, "row_groups": groups},
    "partitioned": parts,
}
json.dump(manifest, open("lake-sizes.json", "w"), indent=1)
print("csv", manifest["csv"], "parquet", single_size, "row groups", groups)
print("single columns", single)
first = parts["2026-10-01"]
print("one day", first)
print("sum of partition files", sum(p["file"] for p in parts.values()))

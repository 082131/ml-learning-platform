# Generates cloud-cost-python.json: what the cloud cost lesson's Python prints for every setting the lesson
# offers. Run: python3 src/lib/data/fixtures/cloud_cost.py
import contextlib, io, json, pathlib

SOURCE = """PRICE = {"standard": 0.023, "infrequent": 0.0125, "archive": 0.004}  # example $ per GB-month
SCAN_PRICE = 5.0  # example $ per TB a query engine scans
NEW_GB = {{newGb}}  # GB landed per month
LIFECYCLE = "{{lifecycle}}"  # none, infrequent or archive: where data older than 3 months goes
QUERIES_PER_DAY = {{queries}}
SCAN = "{{scan}}"  # recent: queries read the last 7 days (partitioned); full: the whole table

months = 12  # the bill in month 12, once a year of data has built up
hot = NEW_GB * min(months, 3)
cold = NEW_GB * months - hot
cold_class = "standard" if LIFECYCLE == "none" else LIFECYCLE
storage = hot * PRICE["standard"] + cold * PRICE[cold_class]
scanned_gb = NEW_GB * 7 / 30 if SCAN == "recent" else NEW_GB * months
queries = QUERIES_PER_DAY * 30 * scanned_gb / 1000 * SCAN_PRICE

print(f"stored: {hot:,} GB standard + {cold:,} GB {cold_class}")
print(f"storage ${storage:,.2f} + queries ${queries:,.2f} = ${storage + queries:,.2f} per month")
if SCAN == "full" and cold_class == "archive":
    print("but full scans cannot read archived objects until they are restored")"""

out = {}
for gb in range(100, 1001, 100):
    for lifecycle in ("none", "infrequent", "archive"):
        for q in (0, 50, 100, 150, 200):
            for scan in ("recent", "full"):
                code = (SOURCE.replace("{{newGb}}", str(gb)).replace("{{lifecycle}}", lifecycle)
                        .replace("{{queries}}", str(q)).replace("{{scan}}", scan))
                buf = io.StringIO()
                with contextlib.redirect_stdout(buf):
                    exec(code, {})
                out[f"{gb},{lifecycle},{q},{scan}"] = buf.getvalue().rstrip("\n")
pathlib.Path(__file__).with_name("cloud-cost-python.json").write_text(json.dumps(out, indent=1) + "\n")

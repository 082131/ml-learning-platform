# Generates sql-query-python.json: what the SQL intro lesson's Python prints for every filter, grouping
# and ordering the lesson offers. Run: python3 src/lib/data/fixtures/sql_query.py
import contextlib, io, json, pathlib

SOURCE = """import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE sales (id INTEGER PRIMARY KEY, city TEXT, product TEXT, amount INTEGER)")
conn.executemany("INSERT INTO sales VALUES (?, ?, ?, ?)", [
    (1, "Oslo", "tea", 12), (2, "Leeds", "coffee", 30), (3, "Oslo", "coffee", 25),
    (4, "Austin", "tea", 8), (5, "Leeds", "tea", 15), (6, "Oslo", "cake", 20),
    (7, "Austin", "coffee", 40), (8, "Leeds", "cake", 9),
])

query = "{{query}}"
for row in conn.execute(query):
    print(row)"""

WHERE = {"none": "", "oslo": "WHERE city = 'Oslo'", "min15": "WHERE amount >= 15", "tea": "WHERE product = 'tea'"}


def build(where, group, order):
    parts = []
    if group == "none":
        parts.append("SELECT id, city, product, amount FROM sales")
    else:
        parts.append(f"SELECT {group}, COUNT(*) AS orders, SUM(amount) AS total FROM sales")
    if WHERE[where]:
        parts.append(WHERE[where])
    if group != "none":
        parts.append(f"GROUP BY {group}")
    if order == "big":
        parts.append("ORDER BY amount DESC" if group == "none" else f"ORDER BY total DESC, {group}")
    elif order == "name":
        parts.append("ORDER BY city, id" if group == "none" else f"ORDER BY {group}")
    return " ".join(parts)


out = {}
for where in WHERE:
    for group in ("none", "city", "product"):
        for order in ("none", "big", "name"):
            q = build(where, group, order)
            buf = io.StringIO()
            with contextlib.redirect_stdout(buf):
                exec(SOURCE.replace("{{query}}", q), {})
            out[f"{where},{group},{order}"] = {"query": q, "printed": buf.getvalue().rstrip("\n")}
pathlib.Path(__file__).with_name("sql-query-python.json").write_text(json.dumps(out, indent=1) + "\n")

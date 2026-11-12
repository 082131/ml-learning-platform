"""Recorded runs for python/pandas/indexing-dtypes: what loc, iloc and friends select, and whether the
original DataFrame changes (pandas 3, copy-on-write)."""
import pathlib, sys

import pandas as pd

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from _runner import run_fixture

TEMPLATE = '''import pandas as pd

df = pd.DataFrame(
    {"city": ["Oslo", "Lima", "Pune", "Kyiv"], "temp": [4.5, 19.0, 31.2, 8.1]},
    index=[10, 20, 30, 40],
)
{{line}}
print(df)'''

LINES = [
    ("loc-label", "print(df.loc[20, \"temp\"])", "loc with a row label"),
    ("iloc-pos", "print(df.iloc[1, 1])", "iloc with positions"),
    ("loc-slice", "print(df.loc[20:30, \"temp\"].tolist())", "a loc slice includes its end label"),
    ("iloc-slice", "print(df.iloc[1:3][\"temp\"].tolist())", "an iloc slice excludes its end"),
    ("bracket-int", "print(df[\"temp\"][1])", "integer key on a labeled Series"),
    ("loc-assign", "df.loc[df[\"temp\"] > 10, \"temp\"] = 0.0", "loc assignment changes df"),
    ("chained", "df[df[\"temp\"] > 10][\"temp\"] = 0.0", "chained assignment"),
    ("subset-copy", "hot = df[df[\"temp\"] > 10]; hot[\"temp\"] = 0.0; print(hot[\"temp\"].tolist())", "change a filtered subset"),
]
VARIANTS = [{"id": i, "label": f"{d}", "slots": {"line": l}} for i, l, d in LINES]


def cards(ns, error, variant):
    df = ns["df"]
    orig = [4.5, 19.0, 31.2, 8.1]
    changed = df["temp"].tolist() != orig
    return [{"label": "df[\"temp\"] afterwards", "value": str(df["temp"].tolist()),
             "note": "df was changed" if changed else "df is unchanged"}]


run_fixture(__file__, TEMPLATE, VARIANTS, cards)

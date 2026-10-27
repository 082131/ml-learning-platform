# Reference output for cleaning.test.ts: run with ~/pyenv/bin/python (CPython 3.13, pandas 3.0.2).
# Prints, for every experiment state, what the lesson's pandas cleaning code prints, and the
# cleaned body masses that feed the pure-Python IQR loop.
import io, itertools, json
import pandas as pd

CSV = """row,species,island,bill_length_mm,bill_depth_mm,flipper_length_mm,body_mass_g,sex
0,Adelie,Torgersen,39.1,18.7,181,3750,male
1,Adelie,Torgersen,39.5,17.4,186,3800,female
2,Adelie,Torgersen,40.3,18,195,3250,female
3,Adelie,Torgersen,NA,NA,NA,NA,NA
4,Adelie,Torgersen,36.7,19.3,193,3450,female
8,Adelie,Torgersen,34.1,18.1,193,3475,NA
9,Adelie,Torgersen,42,20.2,190,4250,NA
152,Gentoo,Biscoe,46.1,13.2,211,4500,female
267,Gentoo,Biscoe,55.1,16,230,5850,male
268,Gentoo,Biscoe,44.5,15.7,217,4875,NA
271,Gentoo,Biscoe,NA,NA,NA,NA,NA
273,Gentoo,Biscoe,50.4,15.7,222,5750,male
300,Chinstrap,Dream,46.7,17.9,195,3300,female
301,Chinstrap,Dream,52,19,197,4150,male
"""
num_cols = ["bill_length_mm", "bill_depth_mm", "flipper_length_mm", "body_mass_g"]
NUM = {"drop": lambda df: df.dropna(subset=num_cols),
       "median": lambda df: df.fillna(df[num_cols].median()),
       "mean": lambda df: df.fillna(df[num_cols].mean())}
SEX = {"drop": lambda c: c.dropna(subset=["sex"]),
       "unknown": lambda c: c.fillna({"sex": "unknown"})}
out = {}
for n, s, t in itertools.product(NUM, SEX, [False, True]):
    df = pd.read_csv(io.StringIO(CSV), index_col="row")
    if t: df.loc[0, "body_mass_g"] = 37500.0
    clean = SEX[s](NUM[n](df))
    mass = clean["body_mass_g"]
    q1, q3 = mass.quantile([0.25, 0.75])
    iqr = q3 - q1
    low, high = q1 - 1.5 * iqr, q3 + 1.5 * iqr
    lines = [f"rows: {len(df)} -> {len(clean)}",
             " ".join(map(str, ["mean:", mass.mean(), "median:", mass.median(), "std:", round(mass.std(), 1)])),
             " ".join(map(str, ["fences:", low, high])),
             " ".join(map(str, ["outliers:", mass[(mass < low) | (mass > high)].index.tolist()]))]
    out[f"{n}/{s}/{'typo' if t else 'clean'}"] = {"printed": "\n".join(lines), "index": clean.index.tolist(), "masses": mass.tolist()}
print(json.dumps(out, indent=1))

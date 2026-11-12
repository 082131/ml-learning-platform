# Generates k-anonymity-python.json: what the lesson's Python prints for every setting the lesson offers.
# Run: python3 src/lib/dataops/fixtures/k_anonymity.py
import json, pathlib
from fill import run

SOURCE = """from collections import defaultdict

ROWS = [  # (age, postcode, sex, diagnosis): age, postcode and sex are quasi-identifiers
    (34, "10115", "F", "asthma"), (37, "10117", "F", "flu"), (31, "10119", "M", "flu"),
    (38, "10115", "M", "diabetes"), (45, "10247", "F", "asthma"), (49, "10245", "F", "asthma"),
    (42, "10243", "M", "flu"), (47, "10249", "M", "migraine"), (52, "10405", "F", "diabetes"),
    (58, "10407", "F", "diabetes"), (55, "10409", "M", "diabetes"), (51, "10405", "M", "diabetes"),
    (63, "10437", "F", "flu"), (66, "10439", "F", "asthma"), (61, "10435", "M", "migraine"),
    (68, "10437", "M", "flu"),
]
AGE = "{{age}}"  # "exact", "10y" bands or "20y" bands
ZIP_DIGITS = {{zip}}  # postcode digits kept; the rest become *
SEX = "{{sex}}"  # "keep" or "drop"


def generalize(age, zip_code, sex):
    if AGE != "exact":
        width = 10 if AGE == "10y" else 20
        age = f"{age // width * width}-{age // width * width + width - 1}"
    return (str(age), zip_code[:ZIP_DIGITS] + "*" * (5 - ZIP_DIGITS), sex if SEX == "keep" else "*")


groups = defaultdict(list)  # generalized quasi-identifiers -> diagnoses of the rows that share them
for age, zip_code, sex, diagnosis in ROWS:
    groups[generalize(age, zip_code, sex)].append(diagnosis)

k = min(len(d) for d in groups.values())  # the smallest group
l = min(len(set(d)) for d in groups.values())  # the fewest distinct diagnoses in a group
print(f"equivalence classes: {len(groups)}, k = {k}, l = {l}")

key = generalize(58, "10407", "F")  # the attacker knows Lena's age, postcode and sex
matches = groups[key]
possible = sorted(set(matches))
verdict = "row identified" if len(matches) == 1 else "diagnosis revealed" if len(possible) == 1 else "not revealed"
print(f"attacker knows (58, 10407, F) -> generalized {key}")
print(f"{len(matches)} matching row(s), possible diagnoses {possible} -> {verdict}")"""

out = {}
for age in ("exact", "10y", "20y"):
    for zip_digits in (5, 3, 0):
        for sex in ("keep", "drop"):
            out[f"{age},{zip_digits},{sex}"] = run(SOURCE, {"age": age, "zip": zip_digits, "sex": sex})
pathlib.Path(__file__).with_name("k-anonymity-python.json").write_text(json.dumps(out, indent=1) + "\n")

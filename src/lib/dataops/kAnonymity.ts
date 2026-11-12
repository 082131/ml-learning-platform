/**
 * The privacy lesson's experiment: 16 patient records with three quasi-identifiers (age, postcode, sex) and a
 * sensitive attribute (diagnosis). The learner generalizes the quasi-identifiers and sees k (the smallest group of
 * identical quasi-identifiers), l (the fewest distinct diagnoses in a group) and what an attacker who knows one
 * person's age, postcode and sex can learn. kAnonymity.test.ts checks every setting against K_ANON_SOURCE run with
 * CPython.
 */
import type { ExperimentDef } from '../types';

export const ROWS: [number, string, string, string][] = [
  [34, '10115', 'F', 'asthma'],
  [37, '10117', 'F', 'flu'],
  [31, '10119', 'M', 'flu'],
  [38, '10115', 'M', 'diabetes'],
  [45, '10247', 'F', 'asthma'],
  [49, '10245', 'F', 'asthma'],
  [42, '10243', 'M', 'flu'],
  [47, '10249', 'M', 'migraine'],
  [52, '10405', 'F', 'diabetes'],
  [58, '10407', 'F', 'diabetes'],
  [55, '10409', 'M', 'diabetes'],
  [51, '10405', 'M', 'diabetes'],
  [63, '10437', 'F', 'flu'],
  [66, '10439', 'F', 'asthma'],
  [61, '10435', 'M', 'migraine'],
  [68, '10437', 'M', 'flu'],
];
/** What the attacker knows about their target (row 9, Lena). */
export const TARGET = { age: 58, zip: '10407', sex: 'F' };

export const AGES = ['exact', '10y', '20y'] as const;
export const ZIPS = [5, 3, 0] as const;
export const SEXES = ['keep', 'drop'] as const;

export interface KAnonState {
  age: (typeof AGES)[number];
  zip: (typeof ZIPS)[number];
  sex: (typeof SEXES)[number];
}

export type Key = [string, string, string];

export function generalize(age: number, zip: string, sex: string, s: KAnonState): Key {
  const band = (w: number) => `${Math.floor(age / w) * w}-${Math.floor(age / w) * w + w - 1}`;
  const a = s.age === 'exact' ? String(age) : band(s.age === '10y' ? 10 : 20);
  const z = zip.slice(0, s.zip) + '*'.repeat(5 - s.zip);
  return [a, z, s.sex === 'keep' ? sex : '*'];
}

export interface Group {
  key: Key;
  rows: number[];
  diagnoses: string[];
}

export interface KAnonResult {
  groups: Group[];
  k: number;
  l: number;
  targetKey: Key;
  targetMatches: number;
  /** Distinct diagnoses among the rows that match the target, sorted. */
  targetDiagnoses: string[];
}

export function kAnonymity(s: KAnonState): KAnonResult {
  const map = new Map<string, Group>();
  ROWS.forEach(([age, zip, sex, diag], i) => {
    const key = generalize(age, zip, sex, s);
    const id = key.join('|');
    if (!map.has(id)) map.set(id, { key, rows: [], diagnoses: [] });
    map.get(id)!.rows.push(i);
    map.get(id)!.diagnoses.push(diag);
  });
  const groups = [...map.values()];
  const targetKey = generalize(TARGET.age, TARGET.zip, TARGET.sex, s);
  const match = map.get(targetKey.join('|'))!;
  return {
    groups,
    k: Math.min(...groups.map((g) => g.rows.length)),
    l: Math.min(...groups.map((g) => new Set(g.diagnoses).size)),
    targetKey,
    targetMatches: match.rows.length,
    targetDiagnoses: [...new Set(match.diagnoses)].sort(),
  };
}

const pyStrList = (xs: string[]) => `[${xs.map((x) => `'${x}'`).join(', ')}]`;

/** What K_ANON_SOURCE prints. */
export function kAnonPrintout(r: KAnonResult): string {
  const verdict =
    r.targetMatches === 1 ? 'row identified' : r.targetDiagnoses.length === 1 ? 'diagnosis revealed' : 'not revealed';
  return [
    `equivalence classes: ${r.groups.length}, k = ${r.k}, l = ${r.l}`,
    `attacker knows (58, 10407, F) -> generalized (${r.targetKey.map((x) => `'${x}'`).join(', ')})`,
    `${r.targetMatches} matching row(s), possible diagnoses ${pyStrList(r.targetDiagnoses)} -> ${verdict}`,
  ].join('\n');
}

export const K_ANON_SOURCE = `from collections import defaultdict

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
print(f"{len(matches)} matching row(s), possible diagnoses {possible} -> {verdict}")`;

export const kAnonSlots = (s: KAnonState) => ({ age: s.age, zip: String(s.zip), sex: s.sex });

export function kAnonExperiment(id: string): ExperimentDef<KAnonState, KAnonResult> {
  return {
    id,
    initial: { age: 'exact', zip: 5, sex: 'keep' },
    controls: [
      {
        kind: 'select',
        id: 'age',
        label: 'Age',
        options: [
          { value: 'exact', label: 'Exact age' },
          { value: '10y', label: '10-year bands' },
          { value: '20y', label: '20-year bands' },
        ],
        get: (s) => s.age,
        set: (s, v) => ({ ...s, age: v as KAnonState['age'] }),
      },
      {
        kind: 'select',
        id: 'zip',
        label: 'Postcode',
        options: [
          { value: '5', label: 'All 5 digits' },
          { value: '3', label: 'First 3 digits' },
          { value: '0', label: 'Removed' },
        ],
        get: (s) => String(s.zip),
        set: (s, v) => ({ ...s, zip: Number(v) as KAnonState['zip'] }),
      },
      {
        kind: 'select',
        id: 'sex',
        label: 'Sex',
        options: [
          { value: 'keep', label: 'Kept' },
          { value: 'drop', label: 'Removed' },
        ],
        get: (s) => s.sex,
        set: (s, v) => ({ ...s, sex: v as KAnonState['sex'] }),
      },
    ],
    compute: kAnonymity,
    readout: (_s, r) => [
      { label: 'Python: what kanon.py prints', value: kAnonPrintout(r) },
      { label: 'k-anonymity', value: `k = ${r.k}` },
      { label: 'l-diversity', value: `l = ${r.l}` },
    ],
  };
}

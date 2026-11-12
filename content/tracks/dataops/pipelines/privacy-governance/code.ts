// Code for the privacy and governance lesson. kanon.py is pure Python; its output for every setting was produced
// with CPython 3.13 (kAnonymity.test.ts checks the browser's version against it). pseudonymize.py runs in the
// browser and is checked under CPython by content/tracks/dataops/python-outputs.test.ts. The datasheet and the
// erasure runbook are illustrations and are not run here.
import { K_ANON_SOURCE, kAnonExperiment, kAnonSlots, type KAnonState } from '@/lib/dataops/kAnonymity';
import type { CodeExample } from '@/lib/types';

export const ka = kAnonExperiment('k-anonymity');

const st = (s: unknown) => s as KAnonState;

export const kanonPython: CodeExample = {
  id: 'kanon-python',
  language: 'python',
  source: K_ANON_SOURCE,
  slots: {
    age: (s) => kAnonSlots(st(s)).age,
    zip: (s) => kAnonSlots(st(s)).zip,
    sex: (s) => kAnonSlots(st(s)).sex,
  },
  annotations: [
    {
      id: 'rows',
      range: { line: 3 },
      kind: 'variable',
      title: 'ROWS',
      what: 'Sixteen patient records. Names are already removed; age, postcode and sex remain, plus the diagnosis.',
      why: 'Removing names is where many teams stop. The quasi-identifiers left behind are what this lesson is about.',
    },
    {
      id: 'age',
      range: { line: 11, startCol: 7, endCol: 14 },
      match: '{{age}}',
      kind: 'parameter',
      title: 'AGE',
      what: 'Exact age, or 10- or 20-year bands, from the control.',
      why: 'Wider bands put more people in each group and remove detail a model might use.',
    },
    {
      id: 'zip',
      range: { line: 12, startCol: 13, endCol: 20 },
      match: '{{zip}}',
      kind: 'parameter',
      title: 'ZIP_DIGITS',
      what: 'How many leading postcode digits are kept.',
      why: 'A full postcode narrows a person down to a street or two; the first three digits to a district.',
    },
    {
      id: 'sex',
      range: { line: 13, startCol: 7, endCol: 14 },
      match: '{{sex}}',
      kind: 'parameter',
      title: 'SEX',
      what: 'Whether sex is released or replaced by *.',
      why: 'Every quasi-identifier you keep splits the groups further.',
    },
    {
      id: 'k',
      range: { line: 27 },
      kind: 'math',
      title: 'k',
      what: 'The size of the smallest group of rows that share the same generalized quasi-identifiers.',
      why: 'If k = 1, someone who knows those three facts about a person finds exactly their row.',
    },
    {
      id: 'l',
      range: { line: 28 },
      kind: 'math',
      title: 'l',
      what: 'The smallest number of distinct diagnoses in any group.',
      why: 'If a group of four all have diabetes, you learn the diagnosis without knowing which row is the person.',
    },
  ],
};

export const pseudoRunner: CodeExample = {
  id: 'pseudo-runner',
  language: 'python',
  run: 'pyodide',
  source: `import hashlib
import hmac

emails = ["ana@example.com", "ben@example.com"]
SECRET_KEY = b"kept-in-a-secrets-manager-not-in-the-dataset"  # rotate it, never ship it with the data


def plain_hash(email):
    return hashlib.sha256(email.encode()).hexdigest()[:16]


def keyed_hash(email):  # HMAC-SHA256: without the key, nobody can compute it
    return hmac.new(SECRET_KEY, email.encode(), hashlib.sha256).hexdigest()[:16]


released = {plain_hash(e): "churned" for e in emails}  # a "pseudonymized" training export
# An attacker with a list of candidate emails hashes each one and looks it up:
for guess in ["carla@example.com", "ben@example.com"]:
    hit = plain_hash(guess) in released
    print(f"plain SHA-256 of {guess:<18} found in export: {hit}")

released_keyed = {keyed_hash(e): "churned" for e in emails}
hit = plain_hash("ben@example.com") in released_keyed
print(f"same attack on the HMAC export: {hit}")
print("same person, same token across tables:", keyed_hash("ben@example.com") == keyed_hash("ben@example.com"))`,
  annotations: [],
  expectedOutput: `plain SHA-256 of carla@example.com  found in export: False
plain SHA-256 of ben@example.com    found in export: True
same attack on the HMAC export: False
same person, same token across tables: True`,
};

export const datasheet: CodeExample = {
  id: 'datasheet-json',
  language: 'json',
  source: `{
  "name": "support-tickets-refund-v8",
  "version": "lakefs://ml-data/train-model-v8",
  "motivation": "Train the refund-request classifier for the support queue.",
  "collection": "Tickets from 2025-01 to 2026-09, EU and UK customers, via the helpdesk export.",
  "consent_and_basis": "Legitimate interest for service improvement; covered by the privacy notice v4.",
  "personal_data": {
    "direct_identifiers": "removed; customer_id replaced by an HMAC token",
    "quasi_identifiers": ["country", "plan", "signup_month"],
    "free_text": "PII scrubbed (emails, phone numbers, card numbers) before labeling"
  },
  "labeling": "Guidelines v2; 3 annotators per item; kappa 0.81 on a 400-item overlap; adjudicated splits.",
  "known_gaps": "Few tickets in Polish and Greek; refund policy changed 2026-06 (concept drift).",
  "intended_use": "Routing tickets. Not for decisions about individual customers' eligibility.",
  "retention": "Snapshots kept 12 months; pinned versions of released models kept while the model is live.",
  "erasure": "Deletion requests applied to main within 30 days; pinned versions rewritten at the next retrain."
}`,
  annotations: [],
};

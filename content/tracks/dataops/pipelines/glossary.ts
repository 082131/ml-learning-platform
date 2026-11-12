import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the dataops/pipelines chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'continuous-training',
    term: 'Continuous training (CT)',
    short:
      'An automated pipeline that retrains, evaluates and (if it passes a gate) registers a new model version whenever it is triggered.',
    long: 'Steps: trigger, take a versioned data snapshot, validate it, train, evaluate against the production model on fresh labeled data, and promote only if the gate passes. Google’s MLOps maturity levels treat automated CT as the step beyond manual retraining.',
    introducedIn: 'dataops/pipelines/retraining-triggers',
    aliases: ['CT', 'automated retraining', 'training pipeline', 'MLOps level 1'],
  },
  {
    id: 'retraining-trigger',
    term: 'Retraining trigger',
    short: 'The rule that starts a retraining run: a schedule, new data volume, detected drift, or a drop in measured performance.',
    long: 'Schedules are simple and predictable; drift triggers react to input changes as they happen; performance triggers react to what matters but only once labels arrive. Many teams combine a schedule with drift and performance alerts.',
    introducedIn: 'dataops/pipelines/retraining-triggers',
    aliases: ['retrain trigger', 'retraining policy', 'scheduled retraining'],
  },
  {
    id: 'label-delay',
    term: 'Label delay',
    short: 'The time between a prediction and the moment its true outcome (the label) becomes known.',
    long: 'Seconds for a click, weeks for a loan default or a fraud chargeback. Performance can only be measured after the delay, so performance-based alerts and triggers lag the problem by at least that long.',
    introducedIn: 'dataops/pipelines/retraining-triggers',
    aliases: ['label latency', 'feedback delay', 'ground-truth delay'],
  },
  {
    id: 'quasi-identifier',
    term: 'Quasi-identifier',
    short: 'A field that does not identify a person on its own but can in combination with others, such as postcode, birth date and sex.',
    long: 'Sweeney showed that ZIP code, birth date and sex together uniquely identify most people in the 1990 US census. Removing names is not enough when quasi-identifiers remain and can be joined with another dataset.',
    introducedIn: 'dataops/pipelines/privacy-governance',
    aliases: ['QI', 'indirect identifier'],
  },
  {
    id: 'pseudonymization',
    term: 'Pseudonymization',
    short: 'Replacing a direct identifier with a token that cannot be linked back to the person without separately kept extra information, such as a secret key.',
    long: 'A keyed hash (HMAC) with a secret key works; a plain hash of an email does not, because anyone can hash candidate emails and compare. Under the GDPR, pseudonymized data is still personal data; only anonymized data is not.',
    introducedIn: 'dataops/pipelines/privacy-governance',
    aliases: ['pseudonymisation', 'tokenization', 'keyed hashing'],
  },
  {
    id: 'k-anonymity',
    term: 'k-anonymity',
    short: 'A table is k-anonymous when every combination of quasi-identifier values is shared by at least k rows.',
    long: 'Reached by generalizing values (age 34 → 30–39, postcode 10115 → 101**) or suppressing rows. It limits re-identification by linking, but not attribute disclosure: if all k rows share a diagnosis, the diagnosis is revealed anyway.',
    introducedIn: 'dataops/pipelines/privacy-governance',
    aliases: ['k anonymity', 'generalization'],
  },
  {
    id: 'l-diversity',
    term: 'l-diversity',
    short: 'A k-anonymous table is l-diverse when every group of rows with the same quasi-identifiers contains at least l different sensitive values.',
    long: 'It closes the homogeneity gap of k-anonymity: a group of 4 people who all have the same diagnosis is 4-anonymous but reveals the diagnosis.',
    introducedIn: 'dataops/pipelines/privacy-governance',
    aliases: ['l diversity'],
  },
  {
    id: 'datasheet-for-datasets',
    term: 'Datasheet for a dataset',
    short: 'A document recording why a dataset was created, how it was collected and labeled, what it contains, and how it may and may not be used.',
    long: 'Proposed by Gebru et al.; data cards and dataset cards are similar formats. They make consent, known gaps, labeling guidelines, retention and intended uses visible to everyone who trains on the data.',
    introducedIn: 'dataops/pipelines/privacy-governance',
    aliases: ['data card', 'dataset card', 'datasheet'],
  },
] satisfies GlossaryTerm[];

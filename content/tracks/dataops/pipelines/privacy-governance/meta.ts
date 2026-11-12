import type { LessonMeta } from '@/lib/types';

export default {
  id: 'dataops/pipelines/privacy-governance',
  title: 'Privacy, consent and governance of training data',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Classify fields as direct identifiers, quasi-identifiers and sensitive attributes',
    'Pseudonymize identifiers with a keyed hash and explain why a plain hash is not enough',
    'Generalize quasi-identifiers until a table is k-anonymous, and measure k, l-diversity and the information lost',
    'Plan deletion requests, retention and documentation (datasheets, data cards) across dataset versions and models',
  ],
  prerequisites: ['dataops/versioning/data-snapshots'],
  concepts: [
    'quasi-identifier',
    'pseudonymization',
    'k-anonymity',
    'l-diversity',
    'datasheet-for-datasets',
    'snapshot-retention',
  ],
  references: [
    {
      title: 'Sweeney: k-Anonymity: A Model for Protecting Privacy (2002)',
      url: 'https://dataprivacylab.org/dataprivacy/projects/kanonymity/kanonymity.pdf',
    },
    {
      title: 'Machanavajjhala et al.: l-Diversity: Privacy Beyond k-Anonymity (ACM TKDD, 2007)',
      url: 'https://doi.org/10.1145/1217299.1217302',
    },
    {
      title: 'Regulation (EU) 2016/679 (GDPR), Article 4(5) pseudonymisation and Article 17 right to erasure',
      url: 'https://eur-lex.europa.eu/eli/reg/2016/679/oj',
    },
    {
      title: 'Python hmac module',
      url: 'https://docs.python.org/3/library/hmac.html',
      version: 'Python 3.13',
    },
    {
      title: 'Gebru et al.: Datasheets for Datasets (Communications of the ACM, 2021)',
      url: 'https://arxiv.org/abs/1803.09010',
    },
  ],
} satisfies LessonMeta;

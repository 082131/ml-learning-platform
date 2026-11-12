import type { ExamDef } from '@/lib/exam/types';
import { tasks } from './handson';
import { questions } from './questions';

export const dataExam: ExamDef = {
  track: 'data',
  title: 'Data Engineering certification exam',
  summary:
    'Scenario questions at the level of the AWS Data Engineer Associate and Google Cloud Professional Data Engineer exams: pipelines, storage design, operations, governance, and the data work that feeds ML models.',
  certifications: [
    {
      name: 'AWS Certified Data Engineer – Associate (DEA-C01)',
      vendor: 'AWS',
      url: 'https://aws.amazon.com/certification/certified-data-engineer-associate/',
      format:
        'Domains: ingestion and transformation 34%, data store management 26%, operations and support 22%, security and governance 18%. 50 scored + 15 unscored questions, pass at 720/1000.',
    },
    {
      name: 'Professional Data Engineer',
      vendor: 'Google Cloud',
      url: 'https://cloud.google.com/learn/certification/data-engineer',
      format:
        'Sections: designing systems ~22%, ingesting and processing ~25%, storing ~20%, preparing data for analysis and ML ~15%, maintaining and automating ~18%.',
    },
  ],
  domains: [
    { id: 'ingest', title: 'Ingestion and transformation', count: 26, maps: 'AWS Domain 1 · GCP §2' },
    { id: 'store', title: 'Data stores and modeling', count: 24, maps: 'AWS Domain 2 · GCP §3' },
    { id: 'ops', title: 'Operations, orchestration, quality', count: 22, maps: 'AWS Domain 3 · GCP §5' },
    { id: 'security', title: 'Security and governance', count: 16, maps: 'AWS Domain 4 · GCP §1.1' },
    { id: 'mlops', title: 'ML data operations', count: 12, maps: 'GCP §4.2 · feeds the ML track' },
  ],
  minutes: 180,
  passPercent: 75,
  questions,
  handsOn: { minutes: 150, passPercent: 70, tasks },
};

import type { ExamDef } from '@/lib/exam/types';
import { tasks } from './handson';
import { questions } from './questions';

export const dataopsExam: ExamDef = {
  track: 'dataops',
  title: 'ML Data Operations certification exam',
  summary:
    'Scenario questions on the data side of ML at the level of AWS MLA-C01 Domain 1, the Databricks ML Professional monitoring and feature-store objectives, and the data parts of the Google PMLE: labeling, label quality, validation and drift, versioning, retraining and privacy.',
  certifications: [
    {
      name: 'AWS Certified Machine Learning Engineer – Associate (MLA-C01)',
      vendor: 'AWS',
      url: 'https://aws.amazon.com/certification/certified-machine-learning-engineer-associate/',
      format:
        'Domain 1, data preparation for ML, is 28% of the exam: ingesting and transforming data, data quality, labeling, pre-training bias (CI, DPL) and compliance. 65 questions in 130 minutes, pass at 720/1000.',
    },
    {
      name: 'Databricks Certified Machine Learning Professional',
      vendor: 'Databricks',
      url: 'https://www.databricks.com/learn/certification/machine-learning-professional',
      format:
        'Model development 44%, MLOps 44%, deployment 12%. 59 scored questions in 120 minutes. Covers point-in-time feature lookups, drift tests, Lakehouse Monitoring and drift-triggered retraining.',
    },
    {
      name: 'Google Cloud Professional Machine Learning Engineer',
      vendor: 'Google Cloud',
      url: 'https://cloud.google.com/learn/certification/machine-learning-engineer',
      format:
        'About 50–60 questions in 2 hours. Its data sections cover data preparation, dataset and model versioning, lineage, and monitoring for skew and drift.',
    },
  ],
  domains: [
    {
      id: 'label',
      title: 'Labeling and agreement',
      count: 22,
      maps: 'AWS Domain 1.3 · weak supervision, active learning',
    },
    { id: 'quality', title: 'Data and label quality', count: 18, maps: 'AWS Domain 1.3 (quality, bias)' },
    {
      id: 'validate',
      title: 'Validation, drift and monitoring',
      count: 20,
      maps: 'Databricks MLOps · Google PMLE monitoring',
    },
    {
      id: 'version',
      title: 'Versioning and lineage',
      count: 14,
      maps: 'Databricks feature store · Google PMLE data management',
    },
    { id: 'pipeline', title: 'Pipelines and retraining', count: 14, maps: 'Databricks MLOps · AWS Domain 4' },
    { id: 'govern', title: 'Privacy and governance', count: 12, maps: 'AWS Domain 1.3 (compliance)' },
  ],
  minutes: 180,
  passPercent: 75,
  questions,
  handsOn: { minutes: 150, passPercent: 70, tasks },
};

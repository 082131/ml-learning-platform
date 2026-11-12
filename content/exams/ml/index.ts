import type { ExamDef } from '@/lib/exam/types';
import { tasks } from './handson';
import { questions } from './questions';

export const mlExam: ExamDef = {
  track: 'ml',
  title: 'Machine Learning Engineer certification exam',
  summary:
    'Scenario questions at professional-exam difficulty, weighted like the Google Cloud Professional ML Engineer and AWS ML Engineer Associate blueprints, written vendor-neutral where the concept is the same on every cloud.',
  certifications: [
    {
      name: 'Professional Machine Learning Engineer',
      vendor: 'Google Cloud',
      url: 'https://cloud.google.com/learn/certification/machine-learning-engineer',
      format:
        'Sections: low-code AI ~13%, data and models ~16%, scaling prototypes ~21%, serving ~20%, pipelines ~18%, monitoring ~13%.',
    },
    {
      name: 'AWS Certified Machine Learning Engineer – Associate (MLA-C01)',
      vendor: 'AWS',
      url: 'https://aws.amazon.com/certification/certified-machine-learning-engineer-associate/',
      format:
        'Domains: data preparation 28%, model development 26%, deployment and orchestration 22%, monitoring, maintenance and security 24%. 65 questions, multiple choice and multiple response.',
    },
  ],
  domains: [
    { id: 'data', title: 'Data preparation and features', count: 16, maps: 'GCP §2.1 · AWS Domain 1' },
    { id: 'model', title: 'Model development and training', count: 22, maps: 'GCP §3 · AWS Domain 2' },
    { id: 'eval', title: 'Evaluation and experimentation', count: 16, maps: 'GCP §2.3 · AWS Domain 2' },
    { id: 'serve', title: 'Serving and scaling', count: 16, maps: 'GCP §4 · AWS Domain 3' },
    { id: 'mlops', title: 'Pipelines and automation', count: 16, maps: 'GCP §5 · AWS Domain 3' },
    {
      id: 'monitor',
      title: 'Monitoring, responsible AI, security',
      count: 14,
      maps: 'GCP §6 · AWS Domain 4',
    },
  ],
  minutes: 180,
  passPercent: 75,
  questions,
  handsOn: { minutes: 150, passPercent: 70, tasks },
};

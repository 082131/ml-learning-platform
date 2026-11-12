import type { ExamDef } from '@/lib/exam/types';
import { tasks } from './handson';
import { questions } from './questions';

export const aiExam: ExamDef = {
  track: 'ai',
  title: 'AI Engineer certification exam',
  summary:
    'Scenario questions at the level of the AWS Generative AI Developer Professional exam, plus the LLM fundamentals NVIDIA tests: model choice, prompting and tools, RAG, safety, cost and evaluation.',
  certifications: [
    {
      name: 'AWS Certified Generative AI Developer – Professional (AIP-C01)',
      vendor: 'AWS',
      url: 'https://aws.amazon.com/certification/certified-generative-ai-developer-professional/',
      format:
        'Domains: FM integration, data and compliance 31%, implementation and integration 26%, safety, security and governance 20%, operational efficiency 12%, testing and troubleshooting 11%. 65 scored questions, pass at 750/1000.',
    },
    {
      name: 'NVIDIA-Certified Professional: Generative AI LLMs (NCP-GENL)',
      vendor: 'NVIDIA',
      url: 'https://www.nvidia.com/en-us/learn/certification/generative-ai-llm-professional/',
      format:
        '60–70 questions in 120 minutes. Covers LLM architecture, prompt engineering 13%, data preparation, fine-tuning, evaluation, deployment and safety (the Inference exam covers its optimization and GPU parts).',
    },
  ],
  domains: [
    {
      id: 'fm',
      title: 'Foundation models and integration',
      count: 16,
      maps: 'AWS Domain 1 · NVIDIA architecture, fine-tuning',
    },
    {
      id: 'prompt',
      title: 'Prompts, tools and agents',
      count: 18,
      maps: 'AWS Domain 2 · NVIDIA prompt engineering',
    },
    {
      id: 'rag',
      title: 'RAG and vector stores',
      count: 22,
      maps: 'AWS Domains 1–2 · NVIDIA data preparation',
    },
    {
      id: 'safety',
      title: 'Safety, security, governance',
      count: 18,
      maps: 'AWS Domain 3 · NVIDIA safety and ethics',
    },
    { id: 'ops', title: 'Cost and latency', count: 12, maps: 'AWS Domain 4' },
    {
      id: 'eval',
      title: 'Evaluation and troubleshooting',
      count: 14,
      maps: 'AWS Domain 5 · NVIDIA evaluation',
    },
  ],
  minutes: 180,
  passPercent: 75,
  questions,
  handsOn: { minutes: 150, passPercent: 70, tasks },
};

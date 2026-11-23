import type { InterviewQuestion, InterviewSource, RoleInfo } from '@/lib/interview/types';
import { aiQuestions } from './questions/ai';
import { behavioralQuestions } from './questions/behavioral';
import { dataQuestions } from './questions/data';
import { dataopsQuestions } from './questions/dataops';
import { deployQuestions } from './questions/deploy';
import { gitQuestions } from './questions/git';
import { inferenceQuestions } from './questions/inference';
import { mlQuestions } from './questions/ml';
import { pythonQuestions } from './questions/python';

export { getScreen, screens } from './screens';

/** Question banks in the order the filter shows them. `loop` describes the rounds candidates report for the role. */
export const roles: RoleInfo[] = [
  {
    id: 'python',
    chip: 'Python',
    title: 'Python for Data & ML',
    loop: 'Asked in the first technical screen of almost every data and ML role: language fundamentals, NumPy and pandas.',
  },
  {
    id: 'ml',
    chip: 'ML',
    title: 'Machine Learning Engineer',
    loop: 'Typical loop: coding, ML coding (implement from scratch), ML breadth, ML system design, behavioral.',
  },
  {
    id: 'data',
    chip: 'Data',
    title: 'Data Engineer',
    loop: 'Typical loop: SQL (often two rounds), Python, data modeling, pipeline system design, behavioral.',
  },
  {
    id: 'ai',
    chip: 'AI',
    title: 'AI Engineer',
    loop: 'Typical loop: a project deep dive, practical coding, LLM system design (RAG, agents, evals), behavioral.',
  },
  {
    id: 'inference',
    chip: 'Inference',
    title: 'Inference Engineer',
    loop: 'Typical loop: systems coding, inference fundamentals with back-of-envelope numbers, serving system design, behavioral.',
  },
  {
    id: 'dataops',
    chip: 'DataOps',
    title: 'ML Data Operations',
    loop: 'Asked within ML engineer and MLOps loops: labeling quality, validation, drift, lineage and governance.',
  },
  {
    id: 'deploy',
    chip: 'Deploy',
    title: 'Model Deployment / MLOps',
    loop: 'Typical loop: Kubernetes and containers, CI/CD for models, rollout and scaling scenarios, platform design, behavioral.',
  },
  {
    id: 'git',
    chip: 'Git',
    title: 'Git, GitHub and documentation',
    loop: 'Asked in project deep dives and "how do you work in a team" rounds of every engineering loop, and directly in MLOps and platform interviews.',
  },
  {
    id: 'behavioral',
    chip: 'Behavioral',
    title: 'Behavioral round',
    loop: 'Every loop has one. Interviewers score motivation, ownership, handling ambiguity, conflict, growth and communication.',
  },
];

export const questions: InterviewQuestion[] = [
  ...pythonQuestions,
  ...mlQuestions,
  ...dataQuestions,
  ...aiQuestions,
  ...inferenceQuestions,
  ...dataopsQuestions,
  ...deployQuestions,
  ...gitQuestions,
  ...behavioralQuestions,
];

/** The 45-minute ML system design delivery framework, used as a checklist beside design questions. */
export const designFramework: { step: string; minutes: string; what: string }[] = [
  {
    step: 'Frame the problem',
    minutes: '5–7 min',
    what: 'Clarify users, scale and latency. State the business goal, then the ML objective and metric.',
  },
  {
    step: 'High-level design',
    minutes: '2–3 min',
    what: 'Sketch inputs, main components and outputs. Keep it simple.',
  },
  {
    step: 'Data and features',
    minutes: '10 min',
    what: 'Where labels come from, leakage and feedback loops, a focused set of features.',
  },
  {
    step: 'Modeling',
    minutes: '10 min',
    what: 'A simple baseline first, then compare a few options and defend one: architecture, loss, trade-offs.',
  },
  {
    step: 'Inference and evaluation',
    minutes: '7 min',
    what: 'Offline and online evaluation tied to the goal. Latency, cost and scale of serving.',
  },
  {
    step: 'Deep dives',
    minutes: 'remaining time',
    what: 'Cold start, monitoring, retraining, failure modes. Follow the interviewer.',
  },
];

/** Public guides the question bank and rubrics were modeled on. Questions are written for this site, not copied. */
export const sources: InterviewSource[] = [
  {
    title: 'Hello Interview: ML System Design in a Hurry',
    url: 'https://www.hellointerview.com/learn/ml-system-design/in-a-hurry/delivery',
    used: 'The design-round delivery framework, its time split and the common mistakes.',
  },
  {
    title: 'Tech Interview Handbook: behavioral interview rubrics',
    url: 'https://www.techinterviewhandbook.org/behavioral-interview-rubrics/',
    used: 'The behavioral dimensions interviewers score and how scope grows with seniority.',
  },
  {
    title: 'PracHub: AI engineer interview questions 2026',
    url: 'https://prachub.com/resources/ai-engineer-interview-questions-2026-rag-agents-evals-and-production-systems',
    used: 'The question clusters for AI engineer loops: RAG debugging, agents, evals, incidents, security.',
  },
  {
    title: 'techinterview.org: AI inference infrastructure interview prep',
    url: 'https://www.techinterview.org/post/3233475331/ai-inference-infrastructure-interview-prep-2026-vllm-triton/',
    used: 'Topics and coding-round styles for inference roles, and the emphasis on quantitative estimates.',
  },
  {
    title: 'techinterview.org: MLOps interview questions',
    url: 'https://www.techinterview.org/post/3233460106/mlops-interview-questions-pipelines-monitoring-and-deployment/',
    used: 'Deployment, CI/CD and monitoring topics, and depth expected by level.',
  },
  {
    title: 'DataDriven: top data engineer interview questions',
    url: 'https://datadriven.io/top-100-data-engineer-interview-questions',
    used: 'Which rounds data engineering loops contain and what interviewers look for in each.',
  },
];

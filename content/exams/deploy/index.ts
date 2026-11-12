import type { ExamDef } from '@/lib/exam/types';
import { tasks } from './handson';
import { questions } from './questions';

export const deployExam: ExamDef = {
  track: 'deploy',
  title: 'Model Deployment and Optimization certification exam',
  summary:
    'Scenario questions at the level of the CNCF Kubernetes exams (CKAD and CKA) and the optimization and deployment parts of the NVIDIA Generative AI LLMs exam: Kubernetes, autoscaling and rollouts, LLM quantization, ONNX and GGUF, llama.cpp and Ollama, and LLM serving.',
  certifications: [
    {
      name: 'Certified Kubernetes Application Developer (CKAD)',
      vendor: 'CNCF',
      url: 'https://www.cncf.io/training/certification/ckad/',
      format:
        'Application design and build 20%, deployment 20%, observability and maintenance 15%, environment, configuration and security 25%, services and networking 20%. Two-hour, hands-on command-line exam.',
    },
    {
      name: 'Certified Kubernetes Administrator (CKA)',
      vendor: 'CNCF',
      url: 'https://www.cncf.io/training/certification/cka/',
      format:
        'Troubleshooting 30%, cluster architecture 25%, services and networking 20%, workloads and scheduling 15%, storage 10%. Two-hour, hands-on command-line exam.',
    },
    {
      name: 'NVIDIA-Certified Professional: Generative AI LLMs (NCP-GENL)',
      vendor: 'NVIDIA',
      url: 'https://www.nvidia.com/en-us/learn/certification/generative-ai-llm-professional/',
      format:
        '60–70 questions in 120 minutes. Model optimization is 17% and deployment 9%, covering quantization, TensorRT, serving and scaling.',
    },
  ],
  domains: [
    {
      id: 'k8s',
      title: 'Kubernetes for models',
      count: 24,
      maps: 'CKAD design, configuration, observability · CKA troubleshooting',
    },
    { id: 'scale', title: 'Autoscaling and rollouts', count: 16, maps: 'CKAD deployment · CKA workloads' },
    { id: 'quant', title: 'LLM quantization', count: 18, maps: 'NVIDIA model optimization' },
    { id: 'formats', title: 'Model formats', count: 14, maps: 'NVIDIA optimization (ONNX, TensorRT)' },
    { id: 'local', title: 'Local LLM runtimes', count: 12, maps: 'NVIDIA deployment' },
    { id: 'serve', title: 'Serving LLMs at scale', count: 16, maps: 'NVIDIA deployment · CKAD services' },
  ],
  minutes: 180,
  passPercent: 75,
  questions,
  handsOn: { minutes: 150, passPercent: 70, tasks },
};

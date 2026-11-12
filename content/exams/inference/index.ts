import type { ExamDef } from '@/lib/exam/types';
import { tasks } from './handson';
import { questions } from './questions';

export const inferenceExam: ExamDef = {
  track: 'inference',
  title: 'Inference Engineer certification exam',
  summary:
    'Scenario and calculation questions at the level of the NVIDIA Generative AI LLMs Professional exam’s optimization, GPU and deployment sections, plus serving on Kubernetes: KV cache math, quantization, ONNX and TensorRT, llama.cpp, batching, Triton and vLLM, and SLOs.',
  certifications: [
    {
      name: 'NVIDIA-Certified Professional: Generative AI LLMs (NCP-GENL)',
      vendor: 'NVIDIA',
      url: 'https://www.nvidia.com/en-us/learn/certification/generative-ai-llm-professional/',
      format:
        '60–70 questions in 120 minutes. Model optimization 17%, GPU acceleration and optimization 14%, model deployment 9%, production monitoring and reliability 7%, plus architecture, fine-tuning and safety.',
    },
    {
      name: 'Certified Kubernetes Administrator (CKA)',
      vendor: 'CNCF / Linux Foundation',
      url: 'https://training.linuxfoundation.org/certification/certified-kubernetes-administrator-cka/',
      format:
        'A hands-on, performance-based exam. This exam covers only its serving-relevant parts: scheduling GPU pods, probes, autoscaling and rollouts.',
    },
  ],
  domains: [
    { id: 'arch', title: 'Inference fundamentals and math', count: 16, maps: 'NVIDIA LLM architecture' },
    { id: 'optimize', title: 'Model optimization and formats', count: 20, maps: 'NVIDIA model optimization' },
    { id: 'gpu', title: 'GPU performance and parallelism', count: 20, maps: 'NVIDIA GPU acceleration' },
    { id: 'serve', title: 'Serving and deployment', count: 20, maps: 'NVIDIA deployment · CKA workloads' },
    {
      id: 'reliability',
      title: 'Monitoring and reliability',
      count: 14,
      maps: 'NVIDIA monitoring and reliability',
    },
    { id: 'adapt', title: 'Adapters, safety and integrity', count: 10, maps: 'NVIDIA fine-tuning, safety' },
  ],
  minutes: 180,
  passPercent: 75,
  questions,
  handsOn: { minutes: 150, passPercent: 70, tasks },
};

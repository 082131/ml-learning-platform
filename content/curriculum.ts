import type { Track } from '@/lib/types';

// Tracks → chapters → lessons, in teaching order. Lesson details live in content/tracks/<id>/meta.ts.
// A lesson becomes 'written' when its index.mdx is complete (validated in npm run check and build).
export const tracks: Track[] = [
  {
    id: 'ml',
    title: 'Machine Learning Engineer',
    code: 'T.01',
    summary:
      'From Python and the math behind models to classical ML, deep learning and the engineering that makes models reliable.',
    chapters: [
      {
        id: 'foundations',
        title: 'Foundations',
        level: 'beginner',
        project: 'ml/foundations/project-foundations',
        lessons: [
          { id: 'ml/foundations/what-is-ml', status: 'written' },
          { id: 'ml/foundations/types-of-ml', status: 'written' },
          { id: 'ml/foundations/python-basics', status: 'written' },
          { id: 'ml/foundations/python-control', status: 'written' },
          { id: 'ml/foundations/python-collections', status: 'written' },
          { id: 'ml/foundations/numpy-arrays', status: 'written' },
          { id: 'ml/foundations/vectorization', status: 'written' },
          { id: 'ml/foundations/pandas-dataframes', status: 'written' },
          { id: 'ml/foundations/matplotlib-plotting', status: 'written' },
          { id: 'ml/foundations/project-foundations', status: 'written' },
        ],
      },
      {
        id: 'math',
        title: 'Mathematical Foundations',
        level: 'beginner',
        project: 'ml/math/project-math',
        lessons: [
          { id: 'ml/math/scalars-vectors', status: 'written' },
          { id: 'ml/math/dot-product', status: 'written' },
          { id: 'ml/math/matrices', status: 'written' },
          { id: 'ml/math/matrix-multiplication', status: 'written' },
          { id: 'ml/math/tensors', status: 'written' },
          { id: 'ml/math/functions-derivatives', status: 'written' },
          { id: 'ml/math/gradients-chain-rule', status: 'written' },
          { id: 'ml/math/probability', status: 'written' },
          { id: 'ml/math/statistics-intuition', status: 'written' },
          { id: 'ml/math/loss-optimization', status: 'written' },
          { id: 'ml/math/project-math', status: 'written' },
        ],
      },
      {
        id: 'classical',
        title: 'Classical Machine Learning',
        level: 'intermediate',
        project: 'ml/classical/project-classification',
        lessons: [
          { id: 'ml/classical/data-cleaning', status: 'written' },
          { id: 'ml/classical/eda', status: 'written' },
          { id: 'ml/classical/features-scaling', status: 'outline' },
          { id: 'ml/classical/splits-leakage', status: 'written' },
          { id: 'ml/classical/linear-regression', status: 'written' },
          { id: 'ml/classical/logistic-regression', status: 'written' },
          { id: 'ml/classical/trees-ensembles', status: 'written' },
          { id: 'ml/classical/clustering-dimred', status: 'outline' },
          { id: 'ml/classical/fit-regularization', status: 'written' },
          { id: 'ml/classical/cross-validation', status: 'outline' },
          { id: 'ml/classical/metrics-error-analysis', status: 'outline' },
          { id: 'ml/classical/project-classification', status: 'written' },
        ],
      },
      {
        id: 'deep',
        title: 'Deep Learning',
        level: 'intermediate',
        project: 'ml/deep/project-neural-net',
        lessons: [
          { id: 'ml/deep/neurons-activations', status: 'written' },
          { id: 'ml/deep/forward-propagation', status: 'written' },
          { id: 'ml/deep/backpropagation', status: 'written' },
          { id: 'ml/deep/optimizers', status: 'written' },
          { id: 'ml/deep/training-loop', status: 'written' },
          { id: 'ml/deep/pytorch-basics', status: 'written' },
          { id: 'ml/deep/tokenization', status: 'written' },
          { id: 'ml/deep/embeddings', status: 'written' },
          { id: 'ml/deep/attention', status: 'written' },
          { id: 'ml/deep/transformers', status: 'written' },
          { id: 'ml/deep/project-neural-net', status: 'written' },
        ],
      },
      {
        id: 'practice',
        title: 'Practical ML Engineering',
        level: 'advanced',
        lessons: [
          { id: 'ml/practice/experiment-tracking', status: 'written' },
          { id: 'ml/practice/hyperparameter-tuning', status: 'written' },
          { id: 'ml/practice/versioning', status: 'written' },
          { id: 'ml/practice/ablations', status: 'written' },
          { id: 'ml/practice/model-testing', status: 'written' },
          { id: 'ml/practice/gpu-training', status: 'written' },
        ],
      },
      {
        id: 'projects',
        title: 'Advanced Projects',
        level: 'advanced',
        lessons: [
          { id: 'ml/projects/capstone-classification', status: 'written' },
          { id: 'ml/projects/capstone-neural-net', status: 'written' },
          { id: 'ml/projects/capstone-finetune', status: 'written' },
          { id: 'ml/projects/capstone-nlp', status: 'written' },
          { id: 'ml/projects/capstone-reproduce', status: 'written' },
        ],
      },
    ],
  },
  {
    id: 'data',
    title: 'Data Engineering',
    code: 'T.02',
    summary:
      'Moving, cleaning, storing and serving data reliably, from SQL and file formats to pipelines that feed ML models.',
    chapters: [
      {
        id: 'python-sql',
        title: 'Python, SQL and formats',
        level: 'beginner',
        lessons: [{ id: 'data/python-sql/formats-sql-intro', status: 'written' }],
      },
      {
        id: 'relational',
        title: 'Relational databases',
        level: 'beginner',
        lessons: [{ id: 'data/relational/joins-indexes', status: 'written' }],
      },
      {
        id: 'ingestion',
        title: 'Ingestion',
        level: 'intermediate',
        lessons: [{ id: 'data/ingestion/apis-formats', status: 'written' }],
      },
      {
        id: 'etl',
        title: 'ETL and ELT',
        level: 'intermediate',
        lessons: [{ id: 'data/etl/etl-vs-elt', status: 'written' }],
      },
      {
        id: 'processing',
        title: 'Batch and stream processing',
        level: 'intermediate',
        lessons: [{ id: 'data/processing/batch-vs-stream', status: 'written' }],
      },
      {
        id: 'storage',
        title: 'Storage architectures',
        level: 'intermediate',
        lessons: [{ id: 'data/storage/warehouse-lake-lakehouse', status: 'written' }],
      },
      {
        id: 'orchestration',
        title: 'Orchestration',
        level: 'intermediate',
        lessons: [{ id: 'data/orchestration/dags-retries', status: 'written' }],
      },
      {
        id: 'distributed',
        title: 'Distributed processing',
        level: 'advanced',
        lessons: [{ id: 'data/distributed/spark-concepts', status: 'written' }],
      },
      {
        id: 'quality',
        title: 'Data quality and observability',
        level: 'advanced',
        lessons: [{ id: 'data/quality/observability-testing', status: 'written' }],
      },
      {
        id: 'cloud',
        title: 'Cloud data platforms',
        level: 'advanced',
        lessons: [{ id: 'data/cloud/storage-permissions-cost', status: 'written' }],
      },
      {
        id: 'features',
        title: 'Feature pipelines',
        level: 'advanced',
        lessons: [{ id: 'data/features/training-serving', status: 'written' }],
      },
      {
        id: 'capstone',
        title: 'Capstone',
        level: 'advanced',
        project: 'data/capstone/ml-ready-pipeline',
        lessons: [{ id: 'data/capstone/ml-ready-pipeline', status: 'written' }],
      },
    ],
  },
  {
    id: 'ai',
    title: 'AI Engineer',
    code: 'T.03',
    summary:
      'Building applications on top of pretrained models: embeddings, retrieval, agents, evaluation and running them in production.',
    chapters: [
      {
        id: 'fundamentals',
        title: 'AI fundamentals',
        level: 'beginner',
        lessons: [{ id: 'ai/fundamentals/ai-landscape', status: 'written' }],
      },
      {
        id: 'representations',
        title: 'Representations',
        level: 'beginner',
        lessons: [{ id: 'ai/representations/tokens-embeddings', status: 'written' }],
      },
      {
        id: 'llm',
        title: 'Large language models',
        level: 'intermediate',
        lessons: [{ id: 'ai/llm/transformers-llms', status: 'written' }],
      },
      {
        id: 'usage',
        title: 'Using pretrained models',
        level: 'intermediate',
        lessons: [{ id: 'ai/usage/pretrained-apis', status: 'written' }],
      },
      {
        id: 'prompting',
        title: 'Prompting',
        level: 'intermediate',
        lessons: [{ id: 'ai/prompting/structured-outputs', status: 'written' }],
      },
      {
        id: 'rag',
        title: 'Retrieval-augmented generation',
        level: 'intermediate',
        lessons: [
          { id: 'ai/rag/rag-pipeline', status: 'written' },
          { id: 'ai/rag/vector-db-eval', status: 'written' },
        ],
      },
      {
        id: 'agents',
        title: 'Agents',
        level: 'advanced',
        lessons: [{ id: 'ai/agents/tool-calling', status: 'written' }],
      },
      {
        id: 'apps',
        title: 'AI applications',
        level: 'advanced',
        lessons: [{ id: 'ai/apps/ai-apis', status: 'written' }],
      },
      {
        id: 'reliability',
        title: 'Reliability',
        level: 'advanced',
        lessons: [{ id: 'ai/reliability/evals-guardrails', status: 'written' }],
      },
      {
        id: 'ops',
        title: 'Operations',
        level: 'advanced',
        lessons: [
          { id: 'ai/ops/latency-cost-security', status: 'written' },
          { id: 'ai/ops/deploy-monitor', status: 'written' },
        ],
      },
      {
        id: 'capstone',
        title: 'Capstone',
        level: 'advanced',
        project: 'ai/capstone/ai-app',
        lessons: [{ id: 'ai/capstone/ai-app', status: 'written' }],
      },
    ],
  },
  {
    id: 'inference',
    title: 'Inference Engineer',
    code: 'T.04',
    summary:
      'Running trained models fast and cheaply: memory, precision, batching, runtimes, profiling and serving.',
    chapters: [
      {
        id: 'basics',
        title: 'Inference basics',
        level: 'beginner',
        lessons: [
          { id: 'inference/basics/what-is-inference', status: 'written' },
          { id: 'inference/basics/tensors-graphs', status: 'written' },
        ],
      },
      {
        id: 'hardware',
        title: 'Hardware',
        level: 'intermediate',
        lessons: [{ id: 'inference/hardware/cpu-vs-gpu', status: 'written' }],
      },
      {
        id: 'memory',
        title: 'Memory',
        level: 'intermediate',
        lessons: [{ id: 'inference/memory/memory-estimation', status: 'written' }],
      },
      {
        id: 'runtime',
        title: 'Runtime',
        level: 'intermediate',
        lessons: [{ id: 'inference/runtime/loading-serialization', status: 'written' }],
      },
      {
        id: 'precision',
        title: 'Precision',
        level: 'intermediate',
        lessons: [{ id: 'inference/precision/precision-quantization', status: 'written' }],
      },
      {
        id: 'compression',
        title: 'Compression',
        level: 'advanced',
        lessons: [{ id: 'inference/compression/quantize-prune-distill', status: 'written' }],
      },
      {
        id: 'runtimes',
        title: 'Runtimes',
        level: 'advanced',
        lessons: [{ id: 'inference/runtimes/onnx-serving', status: 'written' }],
      },
      {
        id: 'throughput',
        title: 'Throughput',
        level: 'advanced',
        lessons: [{ id: 'inference/throughput/batching-throughput', status: 'written' }],
      },
      {
        id: 'perf',
        title: 'Performance',
        level: 'advanced',
        lessons: [
          { id: 'inference/perf/profiling', status: 'written' },
          { id: 'inference/perf/gpu-bottlenecks', status: 'written' },
        ],
      },
      {
        id: 'serving',
        title: 'Serving',
        level: 'advanced',
        lessons: [{ id: 'inference/serving/apis-containers', status: 'written' }],
      },
      {
        id: 'ops',
        title: 'Operations',
        level: 'advanced',
        lessons: [{ id: 'inference/ops/monitoring-load-testing', status: 'written' }],
      },
      {
        id: 'capstone',
        title: 'Capstone',
        level: 'advanced',
        project: 'inference/capstone/deploy-benchmark',
        lessons: [{ id: 'inference/capstone/deploy-benchmark', status: 'written' }],
      },
    ],
  },
  {
    id: 'python',
    title: 'Python for Data & ML',
    code: 'T.05',
    summary:
      'Python as data and ML engineers use it: the language in depth, NumPy, pandas, data cleaning, statistics for analysis, and PyTorch.',
    chapters: [
      {
        id: 'core',
        title: 'Python you will actually use',
        level: 'beginner',
        lessons: [
          { id: 'python/core/functions-scope', status: 'written' },
          { id: 'python/core/references-mutability', status: 'written' },
          { id: 'python/core/iterators-comprehensions', status: 'written' },
          { id: 'python/core/classes-dataclasses', status: 'written' },
          { id: 'python/core/errors-files-environments', status: 'written' },
        ],
      },
      {
        id: 'numpy',
        title: 'NumPy in depth',
        level: 'intermediate',
        lessons: [
          { id: 'python/numpy/indexing-views', status: 'written' },
          { id: 'python/numpy/dtypes-random', status: 'written' },
        ],
      },
      {
        id: 'pandas',
        title: 'pandas for analysis',
        level: 'intermediate',
        lessons: [
          { id: 'python/pandas/indexing-dtypes', status: 'written' },
          { id: 'python/pandas/groupby-merge-reshape', status: 'written' },
          { id: 'python/pandas/time-series', status: 'written' },
        ],
      },
      {
        id: 'cleaning',
        title: 'Data cleaning',
        level: 'intermediate',
        lessons: [
          { id: 'python/cleaning/missing-duplicates-types', status: 'written' },
          { id: 'python/cleaning/text-categories-outliers', status: 'written' },
        ],
      },
      {
        id: 'analysis',
        title: 'Data science and analysis',
        level: 'intermediate',
        lessons: [
          { id: 'python/analysis/eda-visualization', status: 'written' },
          { id: 'python/analysis/statistical-inference', status: 'written' },
        ],
      },
      {
        id: 'pytorch',
        title: 'PyTorch',
        level: 'intermediate',
        lessons: [
          { id: 'python/pytorch/tensors-autograd', status: 'written' },
          { id: 'python/pytorch/datasets-modules', status: 'written' },
          { id: 'python/pytorch/training-loop', status: 'written' },
        ],
      },
      {
        id: 'project',
        title: 'Project',
        level: 'advanced',
        project: 'python/project/end-to-end',
        lessons: [{ id: 'python/project/end-to-end', status: 'written' }],
      },
    ],
  },
  {
    id: 'dataops',
    title: 'ML Data Operations',
    code: 'T.06',
    summary:
      'Running the data side of machine learning: labeling, label quality, data validation and drift, dataset versioning, retraining and governance.',
    chapters: [
      {
        id: 'foundations',
        title: 'Data-centric ML',
        level: 'beginner',
        lessons: [{ id: 'dataops/foundations/data-centric-ml', status: 'written' }],
      },
      {
        id: 'labeling',
        title: 'Labeling and label quality',
        level: 'intermediate',
        lessons: [
          { id: 'dataops/labeling/annotation-agreement', status: 'written' },
          { id: 'dataops/labeling/programmatic-labeling', status: 'written' },
          { id: 'dataops/labeling/label-errors', status: 'written' },
        ],
      },
      {
        id: 'validation',
        title: 'Validation and drift',
        level: 'intermediate',
        lessons: [{ id: 'dataops/validation/baselines-drift', status: 'written' }],
      },
      {
        id: 'versioning',
        title: 'Dataset versioning',
        level: 'advanced',
        lessons: [{ id: 'dataops/versioning/data-snapshots', status: 'written' }],
      },
      {
        id: 'pipelines',
        title: 'Retraining and governance',
        level: 'advanced',
        lessons: [
          { id: 'dataops/pipelines/retraining-triggers', status: 'written' },
          { id: 'dataops/pipelines/privacy-governance', status: 'written' },
        ],
      },
      {
        id: 'capstone',
        title: 'Capstone',
        level: 'advanced',
        project: 'dataops/capstone/data-ops-pipeline',
        lessons: [{ id: 'dataops/capstone/data-ops-pipeline', status: 'written' }],
      },
    ],
  },
  {
    id: 'deploy',
    title: 'Model Deployment and Optimization',
    code: 'T.07',
    summary:
      'Shipping models to real hardware: data and model pipelines, Kubernetes, LLM quantization, ONNX and GGUF, llama.cpp, and serving at scale.',
    chapters: [
      {
        id: 'foundations',
        title: 'The deployment map',
        level: 'beginner',
        lessons: [{ id: 'deploy/foundations/deployment-map', status: 'written' }],
      },
      {
        id: 'pipelines',
        title: 'Data and model pipelines',
        level: 'intermediate',
        lessons: [{ id: 'deploy/pipelines/data-model-pipelines', status: 'written' }],
      },
      {
        id: 'kubernetes',
        title: 'Kubernetes',
        level: 'intermediate',
        lessons: [
          { id: 'deploy/kubernetes/k8s-for-models', status: 'written' },
          { id: 'deploy/kubernetes/autoscaling-rollouts', status: 'written' },
        ],
      },
      {
        id: 'quantization',
        title: 'LLM quantization',
        level: 'advanced',
        lessons: [{ id: 'deploy/quantization/llm-quantization', status: 'written' }],
      },
      {
        id: 'formats',
        title: 'Model formats',
        level: 'advanced',
        lessons: [{ id: 'deploy/formats/onnx-gguf', status: 'written' }],
      },
      {
        id: 'local',
        title: 'Local LLM runtimes',
        level: 'advanced',
        lessons: [{ id: 'deploy/local/llama-cpp-ollama', status: 'written' }],
      },
      {
        id: 'llm-serving',
        title: 'Serving LLMs at scale',
        level: 'advanced',
        lessons: [{ id: 'deploy/llm-serving/vllm-kserve', status: 'written' }],
      },
      {
        id: 'capstone',
        title: 'Capstone',
        level: 'advanced',
        project: 'deploy/capstone/quantize-and-ship',
        lessons: [{ id: 'deploy/capstone/quantize-and-ship', status: 'written' }],
      },
    ],
  },
  {
    id: 'git',
    title: 'Git, GitHub and Documentation',
    code: 'T.08',
    summary:
      'Version control from the inside out: commits, branches, merging and rebasing, GitHub pull requests and CI, semantic versioning and releases, versioning data and models, and writing documentation people use.',
    chapters: [
      {
        id: 'foundations',
        title: 'Git foundations',
        level: 'beginner',
        lessons: [
          { id: 'git/foundations/why-version-control', status: 'written' },
          { id: 'git/foundations/objects-hashes', status: 'written' },
        ],
      },
      {
        id: 'branching',
        title: 'Branching and history',
        level: 'intermediate',
        lessons: [
          { id: 'git/branching/branches-head', status: 'written' },
          { id: 'git/branching/merge-rebase', status: 'written' },
          { id: 'git/branching/merge-conflicts', status: 'written' },
          { id: 'git/branching/undoing-changes', status: 'written' },
        ],
      },
      {
        id: 'github',
        title: 'Collaborating on GitHub',
        level: 'intermediate',
        lessons: [
          { id: 'git/github/remotes', status: 'written' },
          { id: 'git/github/pull-requests', status: 'written' },
          { id: 'git/github/actions-ci', status: 'written' },
        ],
      },
      {
        id: 'releases',
        title: 'Releases and versioning',
        level: 'advanced',
        lessons: [
          { id: 'git/releases/semver-releases', status: 'written' },
          { id: 'git/releases/ml-versioning', status: 'written' },
        ],
      },
      {
        id: 'docs',
        title: 'Documentation',
        level: 'intermediate',
        lessons: [
          { id: 'git/docs/readmes-docstrings', status: 'written' },
          { id: 'git/docs/docs-sites', status: 'written' },
        ],
      },
      {
        id: 'capstone',
        title: 'Capstone',
        level: 'advanced',
        project: 'git/capstone/release-ml-repo',
        lessons: [{ id: 'git/capstone/release-ml-repo', status: 'written' }],
      },
    ],
  },
  {
    id: 'automation',
    title: 'Automation for ML and AI Engineers',
    code: 'T.09',
    summary:
      'Make the computer do the repetitive work: Python scripts and command-line tools, cron schedules, API calls that survive failures, jobs that are safe to rerun, CI/CD for models, pipeline orchestration with Airflow-style DAGs and backfills, webhooks, and AI agents with guardrails.',
    chapters: [
      {
        id: 'scripting',
        title: 'Scripting everyday tasks',
        level: 'beginner',
        lessons: [
          { id: 'automation/scripting/what-to-automate', status: 'written' },
          { id: 'automation/scripting/cli-scripts', status: 'written' },
        ],
      },
      {
        id: 'scheduling',
        title: 'Schedules, APIs and reliable jobs',
        level: 'intermediate',
        lessons: [
          { id: 'automation/scheduling/cron-schedules', status: 'written' },
          { id: 'automation/scheduling/apis-retries', status: 'written' },
          { id: 'automation/scheduling/rerun-safe-jobs', status: 'written' },
        ],
      },
      {
        id: 'cicd',
        title: 'CI/CD for ML',
        level: 'intermediate',
        lessons: [
          { id: 'automation/cicd/ml-ci-pipelines', status: 'written' },
          { id: 'automation/cicd/model-delivery', status: 'written' },
        ],
      },
      {
        id: 'pipelines',
        title: 'Pipeline orchestration',
        level: 'advanced',
        lessons: [
          { id: 'automation/pipelines/dag-orchestration', status: 'written' },
          { id: 'automation/pipelines/schedules-backfills', status: 'written' },
        ],
      },
      {
        id: 'events',
        title: 'Webhooks and AI agents',
        level: 'advanced',
        lessons: [
          { id: 'automation/events/webhooks', status: 'written' },
          { id: 'automation/events/agent-guardrails', status: 'written' },
        ],
      },
      {
        id: 'capstone',
        title: 'Capstone',
        level: 'advanced',
        project: 'automation/capstone/nightly-pipeline',
        lessons: [{ id: 'automation/capstone/nightly-pipeline', status: 'written' }],
      },
    ],
  },
  {
    id: 'sql',
    title: 'SQL and Analytics',
    code: 'T.10',
    summary:
      'Ask questions of data in SQL, with a real SQLite database running in your browser: SELECT and NULL logic, GROUP BY, every join type and its traps, subqueries and CTEs, window functions, analytics patterns (funnels, cohorts, sessions, point-in-time ML features), and how indexes and query plans make queries fast.',
    chapters: [
      {
        id: 'foundations',
        title: 'Reading data with SELECT',
        level: 'beginner',
        lessons: [
          { id: 'sql/foundations/select-basics', status: 'written' },
          { id: 'sql/foundations/nulls-logic', status: 'outline' },
        ],
      },
      {
        id: 'aggregation',
        title: 'Summarising with GROUP BY',
        level: 'beginner',
        lessons: [{ id: 'sql/aggregation/group-by', status: 'outline' }],
      },
      {
        id: 'joins',
        title: 'Combining tables with joins',
        level: 'intermediate',
        lessons: [
          { id: 'sql/joins/join-types', status: 'outline' },
          { id: 'sql/joins/fanout-semi-anti', status: 'outline' },
        ],
      },
      {
        id: 'ctes',
        title: 'Subqueries and CTEs',
        level: 'intermediate',
        lessons: [
          { id: 'sql/ctes/subqueries-ctes', status: 'outline' },
          { id: 'sql/ctes/recursive-ctes', status: 'outline' },
        ],
      },
      {
        id: 'windows',
        title: 'Window functions',
        level: 'intermediate',
        lessons: [
          { id: 'sql/windows/ranking', status: 'outline' },
          { id: 'sql/windows/frames-lag-lead', status: 'outline' },
        ],
      },
      {
        id: 'analytics',
        title: 'Analytics patterns',
        level: 'advanced',
        lessons: [
          { id: 'sql/analytics/funnels-cohorts', status: 'outline' },
          { id: 'sql/analytics/sessions-dedup', status: 'outline' },
          { id: 'sql/analytics/ml-features', status: 'outline' },
        ],
      },
      {
        id: 'performance',
        title: 'Performance',
        level: 'advanced',
        lessons: [
          { id: 'sql/performance/indexes-plans', status: 'outline' },
          { id: 'sql/performance/query-tuning', status: 'outline' },
        ],
      },
      {
        id: 'capstone',
        title: 'Capstone',
        level: 'advanced',
        project: 'sql/capstone/weekly-report',
        lessons: [{ id: 'sql/capstone/weekly-report', status: 'outline' }],
      },
    ],
  },
];

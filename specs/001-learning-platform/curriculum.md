# Curriculum Outline (Release 1)

Format: `lesson-id`: Title · level (B, I or A) · prerequisites · key interactive.
**W** = written in full in release 1. **O** = outline only in release 1 (objectives and prerequisites shown). ★ marks a flagship lesson.
IDs are `track/chapter/lesson`. Prerequisites are written as short IDs within the same track, or as full IDs across tracks. Content threads may refine titles and objectives but must keep IDs stable once merged.

---

## T.01 Machine Learning Engineer (`ml`): all W

### 1. Foundations (`ml/foundations`) · B
1. `what-is-ml`: What AI, ML and deep learning actually mean · none · interactive "rule-based vs learned" spam-filter toy
2. `types-of-ml`: Supervised, unsupervised, reinforcement learning · what-is-ml · sort-the-scenario drag exercise
3. `python-basics`: Python: values, variables, types, printing · none · Pyodide runner, step-through of variable assignment
4. `python-control`: Functions, conditions, loops · python-basics · step-through of a loop with changing state
5. `python-collections`: Lists, dicts, indexing and slicing · python-control · slice visualizer (start:stop:step)
6. `numpy-arrays`: NumPy arrays, shape, dtype, indexing · python-collections · shape explorer, Pyodide
7. `vectorization`: Vectorization and broadcasting · numpy-arrays · broadcasting visualizer, loop vs vectorized (timed live in Pyodide, labeled as this browser's measurement)
8. `pandas-dataframes`: Pandas DataFrames: load, select, filter, group · numpy-arrays · table explorer, Pyodide
9. `matplotlib-plotting`: Plotting with Matplotlib · pandas-dataframes · Pyodide renders the plot to PNG
10. `project-foundations` (project): Analyze a small dataset end to end in Python

### 2. Mathematical Foundations (`ml/math`) · B to I
1. `scalars-vectors`: Scalars, vectors and what a vector means geometrically · numpy-arrays · ★ vector arrows on a plane, add and scale
2. `dot-product`: Dot product, length, angle, similarity · scalars-vectors · draggable vectors with live dot product and cos θ
3. `matrices`: Matrices: dimensions, indexing, addition, transpose · dot-product · ★ matrix grid, transpose animation
4. `matrix-multiplication`: Matrix multiplication, row × column · matrices · ★★ editable A and B, highlighted row and column, step-through, linked NumPy code (the MVP reference lesson)
5. `tensors`: Tensors and shapes (batch, channels, sequence) · matrix-multiplication · shape builder, reshape and transpose
6. `functions-derivatives`: Functions and derivatives as slope · none (math) · tangent-line slider
7. `gradients-chain-rule`: Partial derivatives, gradients, chain rule · functions-derivatives · 2-D gradient field, chain-rule computation graph
8. `probability`: Probability, distributions, expected value · python-basics · sampling simulator, histogram converging to distribution
9. `statistics-intuition`: Mean, variance, standard deviation, correlation vs causation · probability · scatter with confounder toggle
10. `loss-optimization`: Loss functions and optimization · gradients-chain-rule · ★ loss landscape and gradient descent with learning-rate slider
11. `project-math` (project): Implement matrix multiply and gradient descent from scratch, checked against NumPy

### 3. Classical Machine Learning (`ml/classical`) · I
1. `data-cleaning`: Data cleaning and preprocessing · pandas-dataframes · missing values and outliers, before/after
2. `eda`: Exploratory data analysis · data-cleaning, matplotlib-plotting · guided EDA in Pyodide
3. `features-scaling`: Feature engineering and scaling · eda · scaling effect on distance (standardize vs min-max)
4. `splits-leakage`: Train, validation and test sets, data leakage · features-scaling · ★ split visualizer with leakage toggle and score change
5. `linear-regression`: Linear regression · loss-optimization, splits-leakage · ★ adjustable slope and intercept, residuals, closed form vs GD
6. `logistic-regression`: Logistic regression and decision boundaries · linear-regression · ★ 2-D decision boundary, sigmoid
7. `trees-ensembles`: Decision trees, random forests, gradient boosting · logistic-regression · tree split builder (Gini), forest vote
8. `clustering-dimred`: K-means and PCA · dot-product, features-scaling · k-means step-through, PCA projection
9. `fit-regularization`: Overfitting, underfitting, regularization · linear-regression · ★ polynomial degree and λ sliders, train vs validation curves
10. `cross-validation`: Cross-validation · fit-regularization · k-fold diagram with per-fold scores
11. `metrics-error-analysis`: Evaluation metrics and error analysis · logistic-regression · threshold slider: confusion matrix, precision/recall, ROC
12. `project-classification` (project): End-to-end classification model (scikit-learn, run locally; core steps in Pyodide)

### 4. Deep Learning (`ml/deep`) · I to A
1. `neurons-activations`: Neurons, weights, biases, activation functions · logistic-regression · single neuron playground
2. `forward-propagation`: Layers and forward propagation · neurons-activations, matrix-multiplication · ★ NN forward pass, selecting a layer highlights its code
3. `backpropagation`: Loss and backpropagation · forward-propagation, gradients-chain-rule · ★ gradient flow step-through on a 2-2-1 network (computed)
4. `optimizers`: Gradient descent variants and optimizers (SGD, momentum, Adam) · backpropagation · optimizer race on a 2-D loss surface
5. `training-loop`: The training loop, batches, epochs, loss curves · optimizers · ★ live training of a tiny MLP in TypeScript with lr, batch and epoch controls
6. `pytorch-basics`: Building networks with PyTorch · training-loop · annotated PyTorch code + simulated trace + TS equivalent
7. `tokenization`: Tokenization and token IDs · python-collections · tokenizer playground (BPE on a toy vocab, computed)
8. `embeddings`: Embeddings and vector similarity · dot-product, tokenization · 2-D embedding map, cosine similarity
9. `attention`: Attention (Q, K, V) · embeddings, matrix-multiplication · ★ attention weights heatmap, select a token
10. `transformers`: Transformer blocks and sequence modeling · attention · block diagram with shapes at every stage
11. `project-neural-net` (project): Train and evaluate a neural network

### 5. Practical ML Engineering (`ml/practice`) · A
1. `experiment-tracking`: Experiment tracking and reproducibility (seeds, configs) · training-loop · run-comparison table
2. `hyperparameter-tuning`: Hyperparameter tuning (grid, random, early stopping) · experiment-tracking · search-strategy visualizer on a known function
3. `versioning`: Dataset and model versioning · experiment-tracking · lineage diagram
4. `ablations`: Error analysis and ablation studies · metrics-error-analysis · ablation table builder
5. `model-testing`: Model testing and evaluation pipelines · ablations · eval pipeline flow diagram
6. `gpu-training`: GPU fundamentals and training optimization (mixed precision, batch size, data loading) · training-loop · ml→inference/hardware/cpu-vs-gpu link, throughput model (labeled estimate)

### 6. Advanced Projects (`ml/projects`) · A
1. `capstone-classification` (capstone): End-to-end classification system
2. `capstone-neural-net` (capstone): Train and evaluate a neural network from scratch, then in PyTorch
3. `capstone-finetune` (capstone): Fine-tune a pretrained transformer (Hugging Face, run locally or on a free GPU notebook)
4. `capstone-nlp` (capstone): Text-processing / NLP system
5. `capstone-reproduce` (capstone): Reproduce an experiment and document the results

---

## T.02 Data Engineering (`data`)
1. `data/python-sql/formats-sql-intro`: Python for data, SQL and data formats overview · B · O
2. `data/relational/joins-indexes` ★: Schemas, joins, indexes and query plans · B · **W** · interactive join visualizer (inner, left, full) with SQL linked to the result, plus an index lookup vs scan step-through
3. `data/ingestion/apis-formats`: APIs, JSON, CSV, Parquet, ingestion · I · O
4. `data/etl/etl-vs-elt` ★: ETL vs ELT, cleaning, validation, transformation · I · **W** · interactive ETL pipeline diagram where you inject a bad record and watch validation catch it or let it through
5. `data/processing/batch-vs-stream` ★: Batch vs stream processing · I · **W** · side-by-side event-time simulator with windowing, late events and latency vs completeness
6. `data/storage/warehouse-lake-lakehouse`: Warehouses, lakes, lakehouses · I · O
7. `data/orchestration/dags-retries`: Orchestration, scheduling, retries, dependencies · I · O (release 2: DAG failure and retry simulator)
8. `data/distributed/spark-concepts`: Distributed processing with Spark (partitions, shuffles) · A · O
9. `data/quality/observability-testing`: Data quality, lineage, observability, pipeline tests · A · O
10. `data/cloud/storage-permissions-cost`: Cloud storage, permissions, cost, deployment · A · O
11. `data/features/training-serving`: Feature pipelines and training-serving consistency · A · O
12. `data/capstone/ml-ready-pipeline`: Capstone: reliable pipeline that prepares data for an ML model · A · O

## T.03 AI Engineer (`ai`)
1. `ai/fundamentals/ai-landscape`: AI, ML, DL, NLP, GenAI, and when to train, fine-tune, use a pretrained model or call an API · B · O (release 2 builds a decision-tree tool)
2. `ai/representations/tokens-embeddings` ★: Tokenization, embeddings and similarity · B · **W** · tokenizer playground plus embedding similarity search over a small sentence set (computed with a bundled, precomputed small-model embedding table, labeled with the model name)
3. `ai/llm/transformers-llms`: Transformers, attention and LLM fundamentals · I · O (links to ml/deep/attention)
4. `ai/usage/pretrained-apis`: Using pretrained models via libraries and APIs · I · O
5. `ai/prompting/structured-outputs`: Prompt engineering and structured outputs · I · O
6. `ai/rag/rag-pipeline` ★: Retrieval-augmented generation end to end · I · **W** · RAG flow: query → chunking → retrieval (real cosine search over bundled embeddings) → reranking → prompt assembly. The generation step is shown as a labeled simulated response
7. `ai/rag/vector-db-eval`: Vector databases, chunking, reranking, retrieval evaluation · A · O
8. `ai/agents/tool-calling` ★: Tool calling, agents, workflows · A · **W** · agent loop step-through: model emits a tool call, a real in-browser tool (calculator, search over bundled docs) runs, the result is fed back. Model turns are a labeled scripted trace, tool execution is real
9. `ai/apps/ai-apis`: Building AI APIs and connecting frontends · A · O
10. `ai/reliability/evals-guardrails`: Evals, hallucination analysis, guardrails · A · O
11. `ai/ops/latency-cost-security`: Caching, latency, cost, privacy, security · A · O (release 2: latency and cost calculator)
12. `ai/ops/deploy-monitor`: Deploying and monitoring AI apps · A · O
13. `ai/capstone/ai-app`: Capstone: AI application with evaluation and observability · A · O

## T.04 Inference Engineer (`inference`)
1. `inference/basics/what-is-inference`: Inference vs training · B · O
2. `inference/basics/tensors-graphs`: Inputs, outputs, tensors, batches, computational graphs · B · O
3. `inference/hardware/cpu-vs-gpu`: CPU vs GPU execution · I · O
4. `inference/memory/memory-estimation` ★: Memory, VRAM, parameters, activations, KV cache · I · **W** · model memory estimator (parameter count × bytes per precision + activations + KV cache), with the formula shown and every term explained
5. `inference/runtime/loading-serialization`: Loading, serialization, checkpoints · I · O
6. `inference/precision/precision-quantization` ★: FP32, FP16, BF16, INT8 and quantization error · I · **W** · bit-layout explorer plus a quantize/dequantize experiment on real weight values with error histogram (computed)
7. `inference/compression/quantize-prune-distill`: Quantization, pruning, distillation trade-offs · A · O
8. `inference/runtimes/onnx-serving`: ONNX, ONNX Runtime, serving runtimes · A · O
9. `inference/throughput/batching-throughput` ★: Batching, dynamic batching, latency vs throughput · A · **W** · queueing simulator (arrival rate, batch size, max wait) with a latency percentile and throughput chart, plus a roofline-style model labeled as a model
10. `inference/perf/profiling`: Latency, throughput, memory profiling · A · O
11. `inference/perf/gpu-bottlenecks`: GPU utilization and bottleneck analysis · A · O
12. `inference/serving/apis-containers`: Model serving, APIs, containers, deployment · A · O
13. `inference/ops/monitoring-load-testing`: Monitoring, load testing, production debugging · A · O
14. `inference/capstone/deploy-benchmark`: Capstone: deploy, benchmark, optimize · A · O

---

## Counts
- ML: 55 entries (46 lessons, 4 chapter projects, 5 capstones), all written.
- Data: 12 (3 written). AI: 13 (3 written). Inference: 14 (3 written).
- Release 2: write the remaining 30 outline lessons, one thread per track.

## Progression rules
- Beginner lessons: full 12-part structure, heavy scaffolding, hints first.
- Intermediate lessons: fewer hints, exercises require combining two earlier ideas.
- Advanced lessons and projects: brief plus rubric, the learner writes the code, solutions come after self-assessment.
- Cross-track links: AI and Inference lessons link to ML math and deep-learning lessons as prerequisites, rather than re-teaching them.

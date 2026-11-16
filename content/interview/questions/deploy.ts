import type { InterviewQuestion } from '@/lib/interview/types';

// Model Deployment and Optimization: Kubernetes, rollouts, packaging and serving runtimes for models.
export const deployQuestions: InterviewQuestion[] = [
  {
    id: 'dep-probes',
    role: 'deploy',
    kind: 'technical',
    level: 'core',
    topic: 'Kubernetes',
    prompt:
      'A model server takes 90 seconds to load weights. After a deploy, pods restart in a loop and users see errors. Which probes are involved and how should they be set?',
    answer: `Kubernetes has three probes with different consequences. A liveness probe failing makes the kubelet restart the container. A readiness probe failing removes the pod from the Service's endpoints, so it gets no traffic, but does not restart it. A startup probe holds off the other two until it has succeeded once.

The restart loop is a liveness probe that starts checking before the model has loaded: it fails, the container is killed, loading starts again, and it never finishes. The user errors come from readiness reporting ready too early, for example when the HTTP server is up but the weights are not, so traffic reaches a pod that cannot answer.

The fix: a startup probe with enough failure budget to cover the slowest load, say a period of 5 seconds and a threshold of 30. A readiness endpoint that returns success only after the model is loaded and a warm-up inference has run. A liveness probe that checks only that the process is responsive, with no dependence on downstream services, so an outage elsewhere does not restart every pod.

I would also set the rollout so old pods are not removed until new ones are ready.`,
    covers: [
      'What each probe does when it fails',
      'Diagnoses the loop: liveness firing during model load',
      'Startup probe sized for load time; readiness tied to "model loaded and warm"',
      'Liveness kept shallow; rollout waits for readiness',
    ],
    redFlags: [
      'Using the same endpoint and settings for all probes',
      'Fixing it with a long initialDelaySeconds only',
      'Liveness that checks a database or another service',
    ],
    followUps: [
      'What does the pod do on SIGTERM, and why does that matter for in-flight requests?',
      'Where do you see why a pod was restarted?',
    ],
  },
  {
    id: 'dep-requests-limits',
    role: 'deploy',
    kind: 'technical',
    level: 'core',
    topic: 'Kubernetes',
    prompt:
      'Explain resource requests and limits. A model pod is killed with OOMKilled every few hours, and another pod has high latency although the node looks idle. What is going on in each case?',
    answer: `A request is what the scheduler reserves: a pod is placed only on a node with that much unreserved capacity. A limit is the ceiling enforced at runtime. The two resources behave differently when the limit is hit.

Memory is not compressible. A container that exceeds its memory limit is killed by the kernel and reported as OOMKilled. For a model server, steady growth usually means a leak, an unbounded cache or request queue, or batch sizes that occasionally spike. I would look at the memory graph before the kill, fix the cause, and set the limit above the true peak, including the model, runtime overhead and the largest batch. Setting memory request equal to limit avoids being placed on a node that cannot really supply it.

CPU is compressible. A container at its CPU limit is throttled: paused for the rest of each scheduling period. That shows as latency spikes while the node's average CPU looks low, because the quota is per container and multi-threaded inference burns it in bursts. I would check the throttling metrics, then raise or remove the CPU limit while keeping an honest request, and match the runtime's thread count to the allocation.

GPUs are requested as whole devices through an extended resource and are not shared by default.`,
    covers: [
      'Requests drive scheduling; limits are enforced at runtime',
      'Memory over limit: killed. CPU over limit: throttled',
      'Diagnoses each case with the right metric',
      'Thread counts versus CPU allocation; GPU as a whole-device resource',
    ],
    redFlags: [
      'Confusing requests with limits',
      '"Just raise the limit" without finding the growth',
      'Not knowing about CPU throttling',
    ],
    followUps: [
      'What are the QoS classes and which pods are evicted first?',
      'How do several models share one GPU?',
    ],
  },
  {
    id: 'dep-rollout',
    role: 'deploy',
    kind: 'technical',
    level: 'core',
    topic: 'Release',
    prompt:
      'Compare rolling update, blue-green, canary and shadow deployment for a new model version. Which would you use for a model whose errors are costly?',
    answer: `A rolling update replaces pods a few at a time. It is the default and needs no extra capacity, but both versions serve all users during the roll and rollback is another roll.

Blue-green runs the full new version beside the old, then switches traffic at once. Rollback is instant, at the price of double capacity, and every user meets the new version at the same moment.

A canary sends a small share of traffic, say 1%, to the new version, compares metrics with the old, and raises the share in steps. It limits the blast radius and tests on real traffic, but needs traffic splitting and good metrics.

Shadow, or mirroring, copies live requests to the new version and discards its responses. No user is exposed at all. It verifies latency, errors and prediction differences under real load, but cannot measure user reaction, and must not trigger side effects twice.

For a costly-error model I would chain them: shadow first to compare predictions and performance, then a canary with automated analysis and abort thresholds on both system metrics and model metrics, then full rollout, keeping the old version ready for fast rollback. For models, a release can be healthy as a service and wrong as a model, so prediction-quality signals belong in the gate.`,
    covers: [
      'Mechanics and cost of each strategy',
      'Shadow exposes no users but cannot measure outcomes; side-effect caution',
      'Canary with automated abort thresholds',
      'Model-quality metrics in the gate, not only error rate and latency',
    ],
    redFlags: ['Describing only one strategy', 'A canary judged only on HTTP 500s'],
    followUps: [
      'How is a canary different from an A/B test?',
      'What do maxSurge and maxUnavailable control?',
    ],
  },
  {
    id: 'dep-autoscaling',
    role: 'deploy',
    kind: 'technical',
    level: 'senior',
    topic: 'Scaling',
    prompt:
      'You autoscale a GPU model service on CPU utilization and it scales badly: slow to react and often wrong. What would you scale on, and what else limits how well autoscaling works?',
    answer: `CPU utilization is a poor signal for a GPU service: the work happens on the GPU, so CPU can sit low while requests queue. GPU utilization is not much better, since it saturates near 100% under batching and says nothing about how much demand is waiting.

I would scale on a signal proportional to load per replica: requests in flight or queue depth per pod, or for language models, tokens in flight. Latency can work as a target but lags and is non-linear. These come through custom or external metrics to the autoscaler, or through an event-driven autoscaler that can also scale to zero for rarely used models.

The other limit is reaction time. A new replica needs a node, which may need a new GPU machine, then an image of several gigabytes, then weights loaded into memory, which can add up to many minutes. So scaling must anticipate: keep headroom, pre-pull images, cache weights on the node or a fast volume, keep a small pool of warm spare capacity, and use scheduled scaling for known daily peaks.

I would also set a stabilization window so it does not flap, a minimum replica count for availability, and a disruption budget so scale-down and node upgrades do not remove too many pods at once.`,
    covers: [
      'Why CPU and GPU utilization mislead',
      'Queue depth, in-flight requests or tokens per replica via custom metrics',
      'Cold-start chain: node, image, weights; mitigations',
      'Stabilization, minimum replicas, disruption budgets',
    ],
    redFlags: ['"Lower the CPU threshold"', 'Ignoring model load time'],
    followUps: [
      'When is scale-to-zero worth the cold start?',
      'How does the cluster autoscaler interact with the pod autoscaler?',
    ],
  },
  {
    id: 'dep-gguf-onnx',
    role: 'deploy',
    kind: 'technical',
    level: 'core',
    topic: 'Packaging',
    prompt:
      'A team has a fine-tuned language model as PyTorch weights. One group wants to run it on laptops, another on a GPU cluster. Which formats and runtimes would you recommend for each, and why?',
    answer: `The format follows the runtime, and the runtime follows the hardware.

For laptops I would convert to GGUF and run it with llama.cpp or a tool built on it such as Ollama. GGUF is a single file holding quantized weights, the tokenizer and metadata, and llama.cpp runs on CPUs and consumer GPUs with no Python stack. I would pick a 4-bit or 5-bit quantization so the model fits in ordinary memory, and verify the quality on our own evals, since fine-tuned behaviour can be more fragile under quantization. If the fine-tune is a LoRA adapter it should be merged into the base weights before conversion.

For the GPU cluster I would keep the weights in safetensors and serve with an engine built for throughput, such as vLLM, which provides continuous batching, paged KV cache and an OpenAI-compatible API. Quantization there is a choice made for cost, typically 8-bit or a GPU-friendly 4-bit format.

ONNX fits best for smaller, fixed-graph models such as classifiers, embedders and vision models, where ONNX Runtime or TensorRT give portable, optimized inference; for large generative models the specialized engines are ahead.

I would avoid pickle-based weight files from untrusted sources, since loading them can execute code.`,
    covers: [
      'GGUF with llama.cpp for local, CPU-friendly inference; quantization level chosen and verified',
      'safetensors with a batching server for GPU throughput',
      'Where ONNX fits and where it does not',
      'Merging adapters; safety of weight formats',
    ],
    redFlags: ['One format for everything', 'No quality check after conversion'],
    followUps: [
      'What does the Q4_K_M suffix on a GGUF file tell you?',
      'How would you serve many LoRA adapters on one base model?',
    ],
  },
  {
    id: 'dep-image',
    role: 'deploy',
    kind: 'technical',
    level: 'core',
    topic: 'Containers',
    prompt:
      'Your model image is 14 GB, and each release takes 12 minutes to roll out. How do you shrink the image and speed up the release?',
    answer: `I would first see where the bytes are, layer by layer. In model images they are usually the weights copied into the image, a full GPU development base image, and build tools and caches left behind.

Weights do not belong in the application image. They change on a different schedule from code, and a code-only change should not re-ship gigabytes. I would store them in an artifact registry or object storage with a version, and have the pod fetch them at start through an init container or mount them from a cached volume, pinned by digest for reproducibility.

For the rest: a multi-stage build, compiling in one stage and copying only what is needed into a slim runtime base, a runtime GPU image rather than the development one, and only the dependencies actually used, with no package caches.

Layer order matters for release speed. Layers are cached and pulled by content, so the rarely changing ones, base and dependencies, go first and application code last; then a release pulls only a small top layer. Pinning the base by digest keeps that cache stable.

On the cluster side: pre-pull images to GPU nodes, keep the registry close to the cluster, and allow more pods to start in parallel during the rollout if capacity permits.`,
    covers: [
      'Inspects layers before optimizing',
      'Weights out of the image: versioned artifact, fetched or mounted',
      'Multi-stage build, slim runtime base, minimal dependencies',
      'Layer ordering for cache reuse; pre-pulling; rollout parallelism',
    ],
    redFlags: ['Only "use Alpine"', 'Baking weights into every image without discussing the trade-off'],
    followUps: [
      'When is baking weights into the image the better choice?',
      'How do you scan and sign the image before it runs?',
    ],
  },
  {
    id: 'dep-pipeline',
    role: 'deploy',
    kind: 'technical',
    level: 'senior',
    topic: 'CI/CD',
    prompt: 'How does CI/CD for a model differ from CI/CD for an ordinary service? Describe the stages.',
    answer: `An ordinary service has one thing that changes: code. A model system has three: code, data and the model artifact, and its correctness is statistical, so "tests pass" is not enough.

Continuous integration covers the code as usual with linting and unit tests, and adds tests of feature logic, a data schema check, and a tiny end-to-end training run that proves the pipeline works in minutes.

A training pipeline is triggered by code changes, new data or a schedule. It validates data, trains, and evaluates against the current production model on fixed evaluation sets with slices. The output is a versioned artifact in a model registry, carrying its lineage: code commit, data version, parameters, metrics.

Continuous delivery then takes a registered model through gates: metric thresholds versus the champion, checks for latency and size, bias and safety checks where relevant, and for sensitive systems a human approval. Deployment is declarative, the desired model version lives in git and a controller applies it, and rollout is progressive: shadow, canary, full.

The loop closes with monitoring of both service health and model quality, which can trigger retraining or rollback. Rollback means re-pointing to the previous registered version, so that must stay deployable.`,
    covers: [
      'Three moving parts: code, data, model; statistical correctness',
      'CI with data checks and a smoke training run',
      'Training pipeline producing a registered artifact with lineage',
      'Gated promotion, declarative deployment, progressive rollout',
      'Monitoring that feeds back to retraining or rollback',
    ],
    redFlags: [
      'Describing only build, test, deploy',
      'No comparison with the model in production',
      'No model registry or lineage',
    ],
    followUps: [
      'What triggers a retrain when no code changed?',
      'How do you test a model the way you unit-test code?',
    ],
  },
  {
    id: 'dep-sd-llm-on-k8s',
    role: 'deploy',
    kind: 'system-design',
    level: 'senior',
    topic: 'Platform',
    prompt:
      'Design the deployment of an open-weights language model on Kubernetes for an internal chat tool used by 3,000 employees. You have a small GPU budget.',
    answer: `Requirements and numbers first. 3,000 employees might mean 150 concurrent users at peak. I would target a first token within a second and steady streaming, weekday-hours availability, and data that never leaves the company.

Model choice sets the cost. With a small budget I would pick the smallest model that passes our own evaluation, quantized to 8 or 4 bits if quality holds, so it fits on one GPU with room for KV cache. Then measure tokens per second and maximum concurrency on that GPU type to find how many replicas the peak needs.

On the cluster: a GPU node pool with taints so only inference pods land there. A Deployment running vLLM or a similar server with continuous batching, requesting one GPU per pod. Weights come from internal object storage into a node-local cache, not from the image. Startup and readiness probes account for load time. At least two replicas across nodes for availability, with a disruption budget.

In front: a gateway handling single sign-on, per-user rate limits, request logging with privacy controls, and routing by tokens in flight. Autoscale on queue depth between a floor and the budget cap, with scheduled scale-down at night.

Operations: dashboards for time to first token, tokens per second, queue time and GPU memory; a canary for model or config changes; and a defined overload behaviour, queue briefly then reject with a clear message.`,
    covers: [
      'Translates headcount into concurrency and latency targets',
      'Model size and quantization chosen by evaluation and measured throughput',
      'GPU node pool, taints, GPU requests, weights cache, probes',
      'Gateway: auth, rate limits, routing; autoscaling signal and cap',
      'Observability, safe rollout, overload behaviour',
    ],
    redFlags: [
      'Picking the largest model without sizing',
      'One replica with no plan for node failure',
      'No overload or rate-limit story',
    ],
    followUps: [
      'Usage triples next quarter but the budget does not. What do you change?',
      'How would you add a second, larger model for hard questions?',
    ],
  },
];

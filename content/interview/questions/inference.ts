import type { InterviewQuestion } from '@/lib/interview/types';

// Inference Engineer: making models fast and cheap to serve. Interviewers expect numbers, not just technique names.
export const inferenceQuestions: InterviewQuestion[] = [
  {
    id: 'inf-prefill-decode',
    role: 'inference',
    kind: 'technical',
    level: 'core',
    topic: 'LLM inference',
    prompt:
      'Explain the two phases of LLM generation, prefill and decode. Why do they stress the hardware differently, and which user-facing metric does each control?',
    answer: `Prefill processes the whole prompt in one forward pass. All prompt tokens go through the network in parallel, so it is one large batch of matrix multiplications: the GPU's compute is the limit, and its cost grows with prompt length. Prefill ends with the first output token, so it sets time to first token.

Decode then produces one token per forward pass, each depending on the previous one, so it cannot be parallelized across the sequence. Each step does little arithmetic but must read all of the model's weights and the cached attention state from memory. The limit is memory bandwidth, not compute, which is why a single stream leaves the GPU's arithmetic units mostly idle. Decode sets the time between tokens and therefore tokens per second.

The practical consequences: batching many requests during decode is nearly free in latency and multiplies throughput, and long prompts hurt time to first token while long outputs hurt total time.`,
    covers: [
      'Prefill: parallel over prompt tokens, compute-bound, sets time to first token',
      'Decode: sequential, memory-bandwidth-bound, sets inter-token latency',
      'Why batching helps decode so much',
      'Prompt length versus output length effects',
    ],
    redFlags: ['Treating generation as one uniform cost per token', 'No link to user-facing metrics'],
    followUps: [
      'How would you estimate decode tokens per second from model size and memory bandwidth?',
      "Why can a long prefill stall other users' streams, and how do servers avoid it?",
    ],
  },
  {
    id: 'inf-kv-cache',
    role: 'inference',
    kind: 'technical',
    level: 'core',
    topic: 'LLM inference',
    prompt: 'What is the KV cache, why is it needed, and how do you estimate its memory for one request?',
    answer: `In attention, each new token attends to every earlier token using their key and value vectors. Without a cache, generating token n would recompute those vectors for all n-1 earlier tokens at every step, making generation quadratic in length. The KV cache stores each layer's keys and values once per token, so each decode step computes them only for the new token.

The cost is memory that grows linearly with sequence length. Per token it is 2 (keys and values) times the number of layers, times the number of key-value heads, times the head dimension, times bytes per value. For a model with 32 layers, 8 key-value heads of dimension 128 and 16-bit values, that is 2 x 32 x 8 x 128 x 2 bytes, about 131 kB per token, so an 8,000-token context holds about 1 GB.

That figure, not the weights, usually caps how many requests fit on a GPU at once. Servers therefore allocate the cache in fixed-size blocks on demand rather than reserving the maximum length per request, and share blocks for common prompt prefixes.`,
    covers: [
      'What is cached and the recomputation it avoids',
      'Linear growth with context length',
      'The per-token formula with a worked number',
      'KV memory limits concurrency; paged allocation and prefix sharing',
    ],
    redFlags: ['Confusing it with a response cache', 'No memory estimate'],
    followUps: [
      'How does grouped-query attention change this number?',
      'What happens when the cache fills while requests are mid-generation?',
    ],
  },
  {
    id: 'inf-batching',
    role: 'inference',
    kind: 'technical',
    level: 'core',
    topic: 'Serving',
    prompt:
      'Compare static batching, dynamic batching and continuous batching. Why did LLM servers move to the last one?',
    answer: `Static batching waits for a fixed number of requests and runs them together. Throughput is good but the first arrival waits for the batch to fill, and for generation every request in the batch is held until the longest one finishes, with padding wasting compute.

Dynamic batching adds a time limit: run when the batch is full or after a few milliseconds, whichever is first. That bounds queueing delay and suits fixed-cost models such as classifiers or embedders, where every request takes one forward pass.

Generation is different because requests need different numbers of steps. Continuous batching schedules at the level of a single decode step: after each step, finished sequences leave the batch and waiting requests join immediately. No slot idles behind a long request, so GPU utilization and throughput rise sharply and short requests are not held hostage.

The trade-off is that a larger running batch slows each step slightly, so the server caps batch size or tokens to protect inter-token latency, and it must fit new requests' prefill in without stalling the streams in progress.`,
    covers: [
      'Static: waits to fill, held by the longest request',
      'Dynamic: size or timeout, good for single-pass models',
      'Continuous: join and leave per decode step',
      'Latency versus throughput trade-off and the limits servers set',
    ],
    redFlags: ['Treating all three as "just batching"', 'No mention of the latency cost of bigger batches'],
    followUps: [
      'How would you choose the maximum batch size for a latency target?',
      'What is head-of-line blocking here?',
    ],
  },
  {
    id: 'inf-quantization',
    role: 'inference',
    kind: 'technical',
    level: 'core',
    topic: 'Optimization',
    prompt:
      'What does quantizing a model from 16-bit to 4-bit weights buy you, what can it cost, and how do you decide whether to ship it?',
    answer: `Quantization stores weights with fewer bits. Going from 16 to 4 bits cuts weight memory about fourfold, so a model that needed two GPUs may fit on one, or on a laptop. Decode is limited by how fast weights are read from memory, so fewer bytes per weight also raises tokens per second on memory-bound hardware.

The cost is rounding error. At 8 bits the loss is usually negligible; at 4 bits with a good method it is small but real; below that it degrades quickly. Damage is uneven: it shows first on hard reasoning, long outputs and rare languages, and may not show on an average benchmark score. Speed gains also depend on the runtime having fast kernels for that format; without them a quantized model can be slower.

To decide, I compare the quantized and original models on my own task's eval set, look at the worst slices and not only the mean, and measure throughput and latency on the target hardware. Methods that use calibration data, such as GPTQ or AWQ, hold quality better than plain rounding. I would also compare against a smaller model at higher precision, which is sometimes the better trade.`,
    covers: [
      'Memory saving and why it speeds up memory-bound decode',
      'Where quality loss appears; 8-bit versus 4-bit versus lower',
      'Runtime and hardware support determine the real speedup',
      'Decision from task evals and measurements on target hardware',
    ],
    redFlags: [
      '"Quantization makes it 4x faster"',
      'Judging quality by perplexity alone',
      'Not benchmarking on the deployment hardware',
    ],
    followUps: [
      'Weight-only versus weight-and-activation quantization?',
      'Post-training quantization versus quantization-aware training?',
    ],
  },
  {
    id: 'inf-latency-percentiles',
    role: 'inference',
    kind: 'technical',
    level: 'core',
    topic: 'Measurement',
    prompt:
      'Your load test reports 40 ms average latency, yet users complain the service is slow. What is wrong with the measurement?',
    answer: `Three likely problems. First, the average hides the tail. If 2% of requests take two seconds, the mean barely moves but one user in fifty has a bad experience, and a page that makes ten calls hits the tail far more often. I report p50, p95 and p99 from a histogram.

Second, the load generator may be closed-loop: it sends the next request only when the previous one returns. When the server stalls, the generator stops sending, so the slow period is under-sampled. This is coordinated omission. Real users arrive regardless, so I use an open-loop generator with a fixed arrival rate and measure from the intended send time, which includes queueing.

Third, the test may not resemble production: warm caches, one input size, no cold starts, measured at the server so network and client time are missing.

I would also plot latency against load. The useful number is the highest request rate at which p99 still meets the target, because past that point queues grow and latency climbs steeply.`,
    covers: [
      'Percentiles rather than the mean; tail amplification with fan-out',
      'Coordinated omission and open-loop load generation',
      'Realistic inputs, cold starts, client-side timing',
      'Throughput at a latency target, the knee of the curve',
    ],
    redFlags: ['Reporting an average', 'Not knowing how the load tool schedules requests'],
    followUps: ['Why does p99 latency rise sharply before utilization reaches 100%?', 'What is goodput?'],
  },
  {
    id: 'inf-gpu-util',
    role: 'inference',
    kind: 'technical',
    level: 'senior',
    topic: 'Profiling',
    prompt:
      'A GPU inference service shows 30% GPU utilization, yet throughput is far below what the model should reach. Where do you look?',
    answer: `Low utilization with low throughput means the GPU is waiting for work, so the bottleneck is elsewhere. I profile one request end to end and split the time.

The CPU side is the usual suspect: tokenization, image decoding or resizing, and post-processing running in one Python thread. One busy core next to an idle GPU confirms it. The fix is to move preprocessing to more workers or onto the GPU.

Next, batching: if requests run one at a time, each pass uses a sliver of the GPU. I check the actual batch sizes reaching the model and tune dynamic or continuous batching.

Then data movement: copies between host and device for every request, memory that is not pinned, or synchronous transfers. Then the framework itself: Python overhead per operation, no compilation or graph optimization, recompilation on changing input shapes.

I would also remember that the utilization figure only says a kernel was running during the sample period; it does not say the GPU was used efficiently. So I confirm with a profiler timeline and with throughput measurements after each change.`,
    covers: [
      'Reads low utilization as starvation, not spare capacity',
      'CPU preprocessing, small batches, host-device copies, framework overhead',
      'Uses a profiler; changes one thing and re-measures',
      'Knows what the utilization metric does and does not mean',
    ],
    redFlags: ['"Buy a bigger GPU"', 'Guessing without profiling'],
    followUps: [
      'How would you tell memory-bound from compute-bound work on the GPU?',
      'What does a roofline plot show?',
    ],
  },
  {
    id: 'inf-capacity',
    role: 'inference',
    kind: 'technical',
    level: 'senior',
    topic: 'Capacity',
    prompt:
      'Estimate how many GPUs you need to serve 200 requests per second, each with a 1,000-token prompt and a 250-token answer. One GPU sustains 2,500 output tokens per second at your latency target.',
    answer: `I size on output tokens first, since decode usually dominates. Demand is 200 requests per second times 250 tokens, which is 50,000 output tokens per second. At 2,500 per GPU that is 20 GPUs at full load.

Then I correct the estimate. Prefill is not free: 200 times 1,000 is 200,000 prompt tokens per second, and the measured 2,500 figure only holds if it was taken with this prompt length in the mix, so I would confirm the benchmark matches the workload. Next, headroom. Running at 100% means any burst queues, so I target around 60 to 70% utilization at peak, giving about 30 GPUs. Then redundancy for a node or zone failure, and the peak-to-average ratio, since 200 per second may be the mean.

I would also check the memory side: concurrent requests times the KV cache per request must fit. If requests take about 6 seconds, 200 per second means roughly 1,200 in flight, or about 40 per GPU across 30.

Finally I would state the levers that change the answer: prefix caching for shared prompts, quantization, a smaller model for easy requests, and autoscaling to follow the daily curve.`,
    covers: [
      'A clear base calculation: 50,000 tokens/s, 20 GPUs',
      'Checks the benchmark matches the workload, including prefill',
      'Headroom, redundancy, peak versus average',
      'Concurrency and KV memory as a second constraint',
      'Levers that reduce the count',
    ],
    redFlags: ['Stopping at 20', 'Sizing on average load at 100% utilization', 'No memory check'],
    followUps: [
      'Half the prompt is an identical system prompt. How does that change the estimate?',
      'How quickly can you add a GPU, and how does that affect headroom?',
    ],
  },
  {
    id: 'inf-export-runtime',
    role: 'inference',
    kind: 'technical',
    level: 'core',
    topic: 'Runtimes',
    prompt:
      'Why export a PyTorch model to ONNX or compile it with TensorRT instead of serving the PyTorch model directly? What can go wrong in the export?',
    answer: `A training framework is built for flexibility: it runs operations one by one from Python. An inference runtime takes the whole computation graph ahead of time and optimizes it: it folds constants, fuses adjacent operations such as convolution, normalization and activation into one kernel, picks the fastest implementation for the hardware, and can lower precision to 16-bit or 8-bit. It also removes the Python dependency, so the serving image is smaller and starts faster. ONNX is the portable graph format; TensorRT is a compiler that produces an engine specialized to one GPU type.

What goes wrong. Tracing records one path through the code, so Python control flow that depends on the data is silently frozen. Operators may be unsupported or behave slightly differently. Dynamic input shapes must be declared, and an engine built for one shape range fails or runs slowly outside it. Preprocessing left in Python can drift from what the model expects. A compiled engine is tied to a GPU model and runtime version.

So I always verify: run the same inputs through both models and compare outputs within a tolerance, then benchmark on the target hardware.`,
    covers: [
      'Graph-level optimization: fusion, constant folding, kernel selection, lower precision',
      'Deployment benefits: no Python, smaller image',
      'Export pitfalls: frozen control flow, unsupported operators, dynamic shapes, portability',
      'Numerical verification against the original model',
    ],
    redFlags: ['"ONNX is faster" with no mechanism', 'Shipping an export without comparing outputs'],
    followUps: [
      'When would you not bother exporting?',
      'How do you handle a model whose input length varies from 10 to 4,000 tokens?',
    ],
  },
  {
    id: 'inf-sd-llm-serving',
    role: 'inference',
    kind: 'system-design',
    level: 'senior',
    topic: 'LLM serving',
    prompt:
      'Design a multi-tenant LLM serving platform: one 8-billion-parameter model, streaming responses, paying customers with different priorities.',
    answer: `I start with objectives as numbers: time to first token under 500 ms at p95, a floor on tokens per second per stream, and availability. Then the latency budget: queue, prefill, decode, network.

Requests enter a gateway that authenticates, applies per-tenant rate limits in tokens per minute, and routes. Behind it, replicas of an inference server with continuous batching and paged KV cache. Routing prefers replicas with the fewest tokens in flight, and sends requests with the same prompt prefix to the same replica so the prefix cache hits.

Priorities are handled by admission and scheduling: separate queues per tier, reserved capacity for the top tier, and when overloaded the lowest tier is rejected quickly with a retry hint rather than left to time out. Each replica caps its in-flight tokens so decode latency holds.

Streaming needs backpressure: a slow client must not pin a batch slot, so buffers are bounded and disconnected clients cancel generation and free their cache.

Autoscaling follows queue depth and tokens in flight, not GPU utilization, with warm spare capacity because loading a model takes minutes. I would monitor per-tenant time to first token, inter-token latency, queue time, KV memory, and error rates, and plan for out-of-memory and slow nodes.`,
    covers: [
      'Objectives as numbers; a latency budget by stage',
      'Throughput and memory model: continuous batching, KV cache',
      'Token-based rate limits, priority queues, load shedding',
      'Prefix-aware routing; backpressure and cancellation for streams',
      'Autoscaling signal, cold-start time, per-stage observability',
    ],
    redFlags: [
      'A load balancer in front of model replicas with nothing else',
      'Scaling on GPU utilization',
      'No behaviour defined for overload',
    ],
    followUps: [
      'A tenant sends 100,000-token prompts. What breaks and how do you isolate it?',
      'How would speculative decoding or a smaller draft model fit in?',
    ],
  },
  {
    id: 'inf-sd-embedding-service',
    role: 'inference',
    kind: 'system-design',
    level: 'senior',
    topic: 'Model serving',
    prompt:
      'Design a text-embedding service that handles 5,000 requests per second with p99 under 50 ms. Inputs range from 5 to 500 tokens.',
    answer: `An embedding request is one forward pass, so this is a batching and queueing problem.

Budget the 50 ms: about 5 for network and gateway, 5 for tokenization, 10 for queueing, 25 for the model, 5 spare. That means the dynamic batcher's wait is capped at a few milliseconds.

Varying length is the main trap. A batch is padded to its longest member, so one 500-token input makes thirty short inputs pay for 500 tokens each. I would bucket requests by length, a few queues by token range, and batch within a bucket, with a cap on total tokens per batch rather than on request count.

The model is exported and compiled for the GPU with 16-bit precision, with shape profiles matching the buckets. Tokenization runs in a pool of CPU workers so it does not starve the GPU.

Capacity: I measure throughput per GPU per bucket at the latency target, weight by the real length distribution, and add headroom for peaks and one replica lost. Autoscale on queue delay.

Also: a cache keyed by a hash of model version and text, since inputs repeat; a maximum input length with a clear error; and monitoring of batch fill, padding waste, queue time and percentile latency per bucket.`,
    covers: [
      'Latency budget by stage, which bounds the batching delay',
      'Padding waste and length bucketing; token-capped batches',
      'Compiled model, CPU tokenization pool',
      'Capacity from measured throughput with headroom',
      'Caching, input limits, the right autoscaling signal',
    ],
    redFlags: [
      'Batching by request count regardless of length',
      'No budget; "use a GPU and autoscale"',
      'Ignoring the tokenization cost',
    ],
    followUps: [
      'Would a CPU deployment ever be the better choice here?',
      'How do you roll out a new embedding model when stored vectors come from the old one?',
    ],
  },
];

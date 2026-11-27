// Code for "GPU instances". The fit table is src/lib/cloud/gpu.ts (unit-tested). GPU counts and memory come from the
// AWS EC2 accelerated-computing and Google Cloud GPU pages; prices in the lab are illustrative rounded on-demand list
// prices, labelled as such. gpu_fit.py runs under CPython 3.13 and Pyodide (checked by python-outputs.test.ts). The
// AWS CLI command needs credentials and is not run here.
import { BYTES_PER_PARAM, type GpuInput } from '@/lib/cloud/gpu';
import { gpuExperiment } from '@/lib/cloud/experiments';
import type { CodeExample } from '@/lib/types';

export const gpu = gpuExperiment('cloud-gpu');

const G = (s: unknown) => s as GpuInput;

export const fitDemo: CodeExample = {
  id: 'cloud-gpu-fit',
  language: 'python',
  run: 'pyodide',
  source: `BYTES_PER_PARAM = {"serve 16-bit": 2, "serve 4-bit": 0.5, "LoRA (16-bit base)": 2, "full fine-tune (Adam)": 16}
HEADROOM = 1.2                                     # activations, KV cache, CUDA context
GPUS = {"T4": 16, "L4": 24, "L40S": 48, "A100 80GB": 80, "8 x H100": 640}

params_billion = 8
for job, b in BYTES_PER_PARAM.items():
    need = params_billion * b * HEADROOM          # 1e9 params x 1 byte = 1 GB
    fits = [g for g, gb in GPUS.items() if gb >= need]
    print(f"{job:22} {need:6.1f} GB  smallest fit: {fits[0] if fits else 'none'}")`,
  expectedOutput: `serve 16-bit             19.2 GB  smallest fit: L4
serve 4-bit               4.8 GB  smallest fit: T4
LoRA (16-bit base)       19.2 GB  smallest fit: L4
full fine-tune (Adam)   153.6 GB  smallest fit: 8 x H100`,
  annotations: [
    {
      id: 'full',
      range: { line: 1 },
      kind: 'math',
      title: 'Why full fine-tuning needs 16 bytes per parameter',
      what: 'bf16 weights (2) + bf16 gradients (2) + an fp32 master copy (4) + Adam’s two running averages in fp32 (4 + 4) = 16 bytes.',
      why: 'Training keeps far more than the weights. That is why the same model that serves on one GPU needs eight to train fully.',
    },
    {
      id: 'gb',
      range: { line: 7 },
      kind: 'math',
      title: 'Billions of parameters × bytes = GB',
      what: 'A billion parameters at one byte each is one GB, so 8 B params × 2 bytes = 16 GB of weights; × 1.2 headroom = 19.2 GB.',
      why: 'This one multiplication rules out most instance types before you look at a price.',
    },
  ],
};

export const linkedCode: CodeExample = {
  id: 'cloud-gpu-linked',
  language: 'python',
  source: `params_billion = {{params}}
bytes_per_param = {{bytes}}          # {{workload}}
need_gb = params_billion * bytes_per_param * 1.2
print(f"plan for {need_gb:.1f} GB of GPU memory")`,
  slots: {
    params: (s) => String(G(s).paramsB),
    bytes: (s) => String(BYTES_PER_PARAM[G(s).workload]),
    workload: (s) => G(s).workload,
  },
  annotations: [
    {
      id: 'bytes',
      range: { line: 2 },
      kind: 'variable',
      title: 'Bytes per parameter by job',
      what: '2 for 16-bit serving or a frozen 16-bit base, 0.5 for 4-bit, 16 for full training with Adam.',
      why: 'The workload changes the answer more than the model does: an 8B model needs 4.8 GB or 154 GB depending on the job.',
    },
  ],
};

export const quotaCode: CodeExample = {
  id: 'cloud-gpu-quota',
  language: 'bash',
  source: `# How many vCPUs of GPU instances may this account run in us-east-1? (G and P families have separate quotas.)
aws service-quotas list-service-quotas --service-code ec2 --region us-east-1 \\
    --query "Quotas[?contains(QuotaName, 'On-Demand G') || contains(QuotaName, 'On-Demand P')].[QuotaName,Value]" \\
    --output table

# Google Cloud: GPU quotas are per region and per GPU model
gcloud compute regions describe us-central1 --format="table(quotas.metric,quotas.limit,quotas.usage)" | grep -i gpu`,
  annotations: [
    {
      id: 'vcpu',
      range: { line: 1 },
      kind: 'syntax',
      title: 'Quotas are counted in vCPUs',
      what: 'AWS limits running on-demand instances per family group in vCPUs: a p5.48xlarge alone uses 192.',
      why: 'New accounts often start with a quota of 0 for P instances. Request increases days before you need them.',
    },
    {
      id: 'gcp',
      range: { line: 7 },
      kind: 'framework',
      title: 'Google Cloud counts GPUs',
      what: 'Quotas such as NVIDIA_L4_GPUS or NVIDIA_H100_GPUS are set per region.',
      why: 'Having quota in one region does not help in another; check the region where the data is.',
    },
  ],
};

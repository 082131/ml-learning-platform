// Which cloud GPU instances can hold a model for a given job, and what they cost per hour. GPU counts and memory are
// from the AWS EC2 accelerated-computing and Google Cloud GPU machine-type pages. Prices are ILLUSTRATIVE rounded
// on-demand list prices (US East / us-central1) to make the comparison concrete; they change often and differ by
// region, so the lesson labels them as estimates and links the pricing pages.

export type Workload = 'infer-16' | 'infer-4' | 'qlora' | 'lora' | 'full';

/** Bytes of GPU memory per model parameter, before headroom. */
export const BYTES_PER_PARAM: Record<Workload, number> = {
  'infer-16': 2, // 16-bit weights
  'infer-4': 0.5, // 4-bit quantized weights
  qlora: 0.5, // 4-bit frozen base; the small adapters and their optimizer fit in the headroom
  lora: 2, // 16-bit frozen base
  full: 16, // bf16 weights 2 + bf16 gradients 2 + fp32 master copy 4 + Adam m 4 + Adam v 4
};

export const WORKLOAD_LABEL: Record<Workload, string> = {
  'infer-16': 'Serve, 16-bit weights',
  'infer-4': 'Serve, 4-bit quantized',
  qlora: 'Fine-tune with QLoRA (4-bit base)',
  lora: 'Fine-tune with LoRA (16-bit base)',
  full: 'Full fine-tune, mixed precision with Adam',
};

/** Rule-of-thumb headroom for activations, KV cache, CUDA context and fragmentation. */
export const HEADROOM = 1.2;

export interface Instance {
  name: string;
  cloud: 'AWS' | 'Google Cloud';
  gpu: string;
  gpus: number;
  gbPerGpu: number;
  /** Illustrative on-demand $/hour. */
  price: number;
}

export const INSTANCES: Instance[] = [
  { name: 'g4dn.xlarge', cloud: 'AWS', gpu: 'T4', gpus: 1, gbPerGpu: 16, price: 0.53 },
  { name: 'g6.xlarge', cloud: 'AWS', gpu: 'L4', gpus: 1, gbPerGpu: 24, price: 0.8 },
  { name: 'g5.xlarge', cloud: 'AWS', gpu: 'A10G', gpus: 1, gbPerGpu: 24, price: 1.01 },
  { name: 'g6e.xlarge', cloud: 'AWS', gpu: 'L40S', gpus: 1, gbPerGpu: 48, price: 1.86 },
  { name: 'g5.12xlarge', cloud: 'AWS', gpu: 'A10G', gpus: 4, gbPerGpu: 24, price: 5.67 },
  { name: 'p4d.24xlarge', cloud: 'AWS', gpu: 'A100 40GB', gpus: 8, gbPerGpu: 40, price: 22 },
  { name: 'p5.48xlarge', cloud: 'AWS', gpu: 'H100', gpus: 8, gbPerGpu: 80, price: 55 },
  { name: 'g2-standard-4', cloud: 'Google Cloud', gpu: 'L4', gpus: 1, gbPerGpu: 24, price: 0.71 },
  { name: 'a2-highgpu-1g', cloud: 'Google Cloud', gpu: 'A100 40GB', gpus: 1, gbPerGpu: 40, price: 3.67 },
  { name: 'a2-ultragpu-1g', cloud: 'Google Cloud', gpu: 'A100 80GB', gpus: 1, gbPerGpu: 80, price: 5.07 },
  { name: 'a3-highgpu-8g', cloud: 'Google Cloud', gpu: 'H100', gpus: 8, gbPerGpu: 80, price: 88 },
];

export interface GpuInput {
  /** Model size in billions of parameters. */
  paramsB: number;
  workload: Workload;
}

export type Fit = 'one-gpu' | 'split' | 'too-small';

export interface InstanceFit extends Instance {
  totalGb: number;
  fit: Fit;
  /** Memory left over (GB) on the whole instance; negative when it does not fit. */
  spareGb: number;
}

export interface GpuResult {
  /** Memory needed in GB: params (billions) × bytes per param × headroom. 1e9 params × 1 byte = 1 GB. */
  needGb: number;
  weightsGb: number;
  fits: InstanceFit[];
  /** The cheapest instance that fits (on one GPU if any fits that way at the same price). */
  cheapest: InstanceFit | null;
}

export function gpuNeed(x: GpuInput): { weightsGb: number; needGb: number } {
  const weightsGb = x.paramsB * BYTES_PER_PARAM[x.workload];
  return { weightsGb, needGb: weightsGb * HEADROOM };
}

export function fitInstances(x: GpuInput, catalog: Instance[] = INSTANCES): GpuResult {
  const { weightsGb, needGb } = gpuNeed(x);
  const fits = catalog.map((i) => {
    const totalGb = i.gpus * i.gbPerGpu;
    const fit: Fit = needGb <= i.gbPerGpu ? 'one-gpu' : needGb <= totalGb ? 'split' : 'too-small';
    return { ...i, totalGb, fit, spareGb: totalGb - needGb };
  });
  const ok = fits.filter((f) => f.fit !== 'too-small').sort((a, b) => a.price - b.price);
  return { needGb, weightsGb, fits, cheapest: ok[0] ?? null };
}

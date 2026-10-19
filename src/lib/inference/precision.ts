/** Storage formats for weights, KV cache and activations, with bytes per stored value. */
export type Precision = 'fp32' | 'fp16' | 'bf16' | 'int8' | 'int4';

export const PRECISIONS: Record<Precision, { label: string; bytes: number }> = {
  fp32: { label: 'FP32 (4 bytes)', bytes: 4 },
  fp16: { label: 'FP16 (2 bytes)', bytes: 2 },
  bf16: { label: 'BF16 (2 bytes)', bytes: 2 },
  int8: { label: 'INT8 (1 byte)', bytes: 1 },
  int4: { label: 'INT4 (half a byte)', bytes: 0.5 },
};

export const isFloat = (p: Precision) => p === 'fp32' || p === 'fp16' || p === 'bf16';

/**
 * Integer weights are dequantized for the matmul, so activations stay in a 16-bit float
 * (weight-only quantization). Float weights compute in their own precision.
 */
export const activationPrecision = (weights: Precision): Precision => (isFloat(weights) ? weights : 'fp16');

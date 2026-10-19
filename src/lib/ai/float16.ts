/** Converts one IEEE 754 half-precision value (as its 16 bits) to a number. */
export function halfToNumber(bits: number): number {
  const sign = bits & 0x8000 ? -1 : 1;
  const exponent = (bits >> 10) & 0x1f;
  const fraction = bits & 0x3ff;
  if (exponent === 0) return sign * 2 ** -14 * (fraction / 1024);
  if (exponent === 0x1f) return fraction ? NaN : sign * Infinity;
  return sign * 2 ** (exponent - 15) * (1 + fraction / 1024);
}

/** Decodes base64 little-endian float16 data into `rows` vectors of equal length. */
export function decodeFloat16Rows(base64: string, rows: number): number[][] {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const count = bytes.length / 2;
  if (!Number.isInteger(count) || count % rows !== 0)
    throw new Error(`float16 data of ${bytes.length} bytes can't be split into ${rows} rows`);
  const view = new DataView(bytes.buffer);
  const dims = count / rows;
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: dims }, (_, d) => halfToNumber(view.getUint16((r * dims + d) * 2, true))),
  );
}

const SIZE = 5;

/** A small filled marker centered on (x, y). */
export function Marker({ shape, x, y, size = SIZE }: { shape: 'circle' | 'square' | 'triangle'; x: number; y: number; size?: number }) {
  if (shape === 'circle') return <circle cx={x} cy={y} r={size} stroke="none" />;
  if (shape === 'square') return <rect x={x - size} y={y - size} width={2 * size} height={2 * size} stroke="none" />;
  const h = size * 1.2;
  return <polygon points={`${x},${y - h} ${x + h},${y + h * 0.8} ${x - h},${y + h * 0.8}`} stroke="none" />;
}

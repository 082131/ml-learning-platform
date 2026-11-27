import { describe, expect, it } from 'vitest';
import { formatBytes, warehouse } from './warehouse';

describe('warehouse cost simulation', () => {
  it('works through the lesson numbers by hand', () => {
    // SELECT *: 139 bytes per row × 2 billion rows = 278 GB.
    const all = warehouse({ columns: 'all', filter: 'none', source: 'raw' });
    expect(all.bytesRead).toBe(278e9);
    expect(formatBytes(all.bytesRead)).toBe('278 GB');
    // Three columns: 7 bytes per row = 14 GB, 1/20th.
    expect(warehouse({ columns: 'needed', filter: 'none', source: 'raw' }).bytesRead).toBe(14e9);
    // 30 of 730 daily partitions.
    const month = warehouse({ columns: 'needed', filter: 'month', source: 'raw' });
    expect(month.partitionsRead).toBe(30);
    expect(formatBytes(month.bytesRead)).toBe('575 MB');
    // A function around the partition column reads every partition again.
    expect(warehouse({ columns: 'needed', filter: 'month-fn', source: 'raw' }).bytesRead).toBe(14e9);
    // The summary table: 3,650 rows of 19 bytes.
    expect(warehouse({ columns: 'needed', filter: 'none', source: 'summary' }).bytesRead).toBe(3650 * 19);
    expect(all.cost).toBeCloseTo((278e9 / 1024 ** 4) * 6, 6);
  });
});

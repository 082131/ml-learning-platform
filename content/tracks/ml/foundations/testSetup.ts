// Test-only setup for python-outputs.test.ts. Not imported by lessons.

/**
 * Known, explained differences between CPython on a 64-bit computer and Pyodide in the browser,
 * applied to CPython's output before comparing. Lessons show the browser's output.
 */
export const CPYTHON_DIFFERENCES: Record<string, (out: string) => string> = {
  // NumPy's default integer is 64-bit on a 64-bit computer but 32-bit in Pyodide (WebAssembly is 32-bit).
  'arrays-runner': (out) => out.replace(/\bint64\b/g, 'int32'),
};

/** Python run before each example (none needed yet). `dir` is the working directory for data files. */
export const pythonSetup = (dir: string) => `# setup for ${JSON.stringify(dir)}`;

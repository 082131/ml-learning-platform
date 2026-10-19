// Test helper: runs Python with the local CPython so lesson numbers can be checked against real output.
// Only tests import this file. Tests that use it are skipped where python3 is missing.
import { execFileSync } from 'node:child_process';

export const hasPython = (() => {
  try {
    execFileSync('python3', ['--version']);
    return true;
  } catch {
    return false;
  }
})();

/** Runs `code` with python3 and returns what it printed. */
export function runPython(code: string): string {
  return execFileSync('python3', ['-c', code], { encoding: 'utf8' });
}

/** Can python3 import this module (numpy, pandas)? */
export function hasModule(name: string): boolean {
  if (!hasPython) return false;
  try {
    execFileSync('python3', ['-c', `import ${name}`], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

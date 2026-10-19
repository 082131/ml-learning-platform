import { execFileSync } from 'node:child_process';

/** True when a CPython 3 interpreter is on PATH (the build container has 3.13). */
export function hasPython(): boolean {
  try {
    execFileSync('python3', ['--version']);
    return true;
  } catch {
    return false;
  }
}

/** Runs `code` with CPython and returns what it printed, without the final newline. */
export const runPython = (code: string): string =>
  execFileSync('python3', ['-c', code], { encoding: 'utf8' }).replace(/\n$/, '');

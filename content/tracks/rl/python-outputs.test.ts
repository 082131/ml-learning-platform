// Every exercise solution in the Reinforcement learning track must pass its own tests under CPython, and every starter
// must fail them; every runnable example (run: 'pyodide') must print its expectedOutput. Exercises use only the
// standard library.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { hasPython } from '@/lib/foundations/pythonOracle';
import type { CodeExample, Exercise } from '@/lib/types';

const codeModules = import.meta.glob<Record<string, unknown>>('./*/*/code.ts', { eager: true });
const quizModules = import.meta.glob<Record<string, unknown>>('./*/*/quiz.ts', { eager: true });
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

const runnable = Object.values(codeModules)
  .flatMap((m) => Object.values(m))
  .filter(
    (v): v is CodeExample => isObject(v) && v.run === 'pyodide' && typeof v.expectedOutput === 'string',
  );
const exercises = Object.values(quizModules)
  .flatMap((m) => Object.values(m))
  .filter((v): v is Exercise => isObject(v) && Array.isArray(v.hints) && typeof v.tests === 'string');

const work = mkdtempSync(path.join(tmpdir(), 'mlp-rl-'));
function cpython(code: string): { out: string; ok: boolean } {
  const file = path.join(work, 'run.py');
  writeFileSync(file, code);
  try {
    return { out: execFileSync('python3', [file], { encoding: 'utf8', cwd: work, stdio: 'pipe' }), ok: true };
  } catch (e) {
    return { out: String((e as { stderr?: string }).stderr ?? e), ok: false };
  }
}

describe.skipIf(!hasPython)('Reinforcement learning track exercises under CPython', () => {
  it('found the runnable examples and exercises', () => {
    expect(runnable.length).toBeGreaterThanOrEqual(10);
    expect(exercises.length).toBeGreaterThanOrEqual(12);
  });

  for (const ex of runnable)
    it(`${ex.id} prints its expectedOutput`, () => {
      const r = cpython(ex.source);
      expect(r.ok, r.out).toBe(true);
      expect(r.out.replace(/\n$/, '')).toBe(ex.expectedOutput);
    });

  for (const ex of exercises)
    it(`${ex.id}: the solution passes and the starter fails`, () => {
      const solved = cpython(`${ex.solution}\n${ex.tests}`);
      expect(solved.ok, solved.out).toBe(true);
      expect(cpython(`${ex.starter ?? ''}\n${ex.tests}`).ok).toBe(false);
    });
});

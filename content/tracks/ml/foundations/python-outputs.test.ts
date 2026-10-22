// Every runnable example in this chapter is run for real, and its printed output must equal the
// expectedOutput the lesson shows before a run. Every exercise solution must pass its own tests and
// every starter must fail them. CPython runs always (when installed). With PYODIDE_DIR set to an
// extracted Pyodide 314.0.7 distribution, the same code also runs in Pyodide, the browser's runtime.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { hasModule, hasPython } from '@/lib/foundations/pythonOracle';
import type { CodeExample, Exercise } from '@/lib/types';
import { CPYTHON_DIFFERENCES, pythonSetup } from './testSetup';

const codeModules = import.meta.glob<Record<string, unknown>>('./*/code.ts', { eager: true });
const quizModules = import.meta.glob<Record<string, unknown>>('./*/quiz.ts', { eager: true });
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

const runnable = Object.values(codeModules)
  .flatMap((m) => Object.values(m))
  .filter(
    (v): v is CodeExample => isObject(v) && v.run === 'pyodide' && typeof v.expectedOutput === 'string',
  );
const exercises = Object.values(quizModules)
  .flatMap((m) => Object.values(m))
  .filter((v): v is Exercise => isObject(v) && Array.isArray(v.hints) && typeof v.tests === 'string');

const usesModule = (code: string, name: string) =>
  new RegExp(`^\\s*(import|from)\\s+${name}\\b`, 'm').test(code);
const canRun = (code: string) =>
  ['numpy', 'pandas', 'matplotlib'].every((m) => !usesModule(code, m) || hasModule(m));

const work = mkdtempSync(path.join(tmpdir(), 'mlp-foundations-'));
function cpython(code: string): { out: string; ok: boolean } {
  const file = path.join(work, 'run.py');
  writeFileSync(file, `${pythonSetup(work)}\n${code}`);
  try {
    return { out: execFileSync('python3', [file], { encoding: 'utf8', cwd: work, stdio: 'pipe' }), ok: true };
  } catch (e) {
    return { out: String((e as { stderr?: string }).stderr ?? e), ok: false };
  }
}

describe.skipIf(!hasPython)('foundations examples under CPython', () => {
  it('found the runnable examples and exercises', () => {
    expect(runnable.length).toBeGreaterThan(0);
    expect(exercises.length).toBeGreaterThan(0);
  });

  for (const ex of runnable)
    it.skipIf(!canRun(ex.source))(`${ex.id} prints its expectedOutput`, () => {
      const r = cpython(ex.source);
      expect(r.ok, r.out).toBe(true);
      const fix = CPYTHON_DIFFERENCES[ex.id] ?? ((s: string) => s);
      expect(fix(r.out.replace(/\n$/, ''))).toBe(ex.expectedOutput);
    });

  for (const ex of exercises)
    it.skipIf(!canRun(ex.solution + ex.tests))(`${ex.id}: the solution passes and the starter fails`, () => {
      const solved = cpython(`${ex.solution}\n${ex.tests}`);
      expect(solved.ok, solved.out).toBe(true);
      expect(cpython(`${ex.starter ?? ''}\n${ex.tests}`).ok).toBe(false);
    });
});

const PYODIDE_DIR = process.env.PYODIDE_DIR;

/** Runs each program in a fresh Pyodide namespace in a child Node process; returns stdout per program. */
function pyodideOutputs(programs: string[]): string[] {
  const script = path.join(work, 'pyodide-run.mjs');
  writeFileSync(
    script,
    `import { loadPyodide } from ${JSON.stringify(path.join(PYODIDE_DIR!, 'pyodide.mjs'))};
import { readFileSync } from 'node:fs';
const programs = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const py = await loadPyodide({ indexURL: ${JSON.stringify(`${PYODIDE_DIR}/`)} });
py.runPython('import os\\nos.environ["MPLBACKEND"] = "AGG"');
let out = '';
py.setStdout({ batched: (t) => (out += t + '\\n') });
const results = [];
for (const code of programs) {
  out = '';
  await py.loadPackagesFromImports(code, { messageCallback: () => {} });
  py.runPython(code, { globals: py.toPy({}) });
  results.push(out);
}
process.stdout.write('\\n@@RESULTS@@' + JSON.stringify(results));`,
  );
  const input = path.join(work, 'programs.json');
  writeFileSync(input, JSON.stringify(programs));
  const raw = execFileSync('node', [script, input], { encoding: 'utf8', cwd: work, maxBuffer: 1 << 26 });
  return JSON.parse(raw.split('@@RESULTS@@').at(-1)!) as string[];
}

describe.skipIf(!PYODIDE_DIR)('foundations examples in Pyodide (the browser runtime)', () => {
  it('prints every expectedOutput exactly', () => {
    const outputs = pyodideOutputs(runnable.map((ex) => `${pythonSetup(work)}\n${ex.source}`));
    runnable.forEach((ex, i) => expect(outputs[i]!.replace(/\n$/, ''), ex.id).toBe(ex.expectedOutput));
  }, 300_000);
});

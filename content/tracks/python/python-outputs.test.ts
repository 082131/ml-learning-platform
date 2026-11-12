// Every runnable example in the Python course is run for real, and its printed output must equal the
// expectedOutput the lesson shows. Examples that run in the browser (run: 'pyodide') run under the local
// CPython. PyTorch examples are shown with output recorded from PyTorch 2.14.1 on CPU; they are re-run
// when TORCH_PYTHON points to a Python with torch installed (otherwise skipped). Every exercise solution
// must pass its tests and every starter must fail them, and every recorded-experiment fixture must match
// a fresh run of its script.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { hasModule, hasPython } from '@/lib/foundations/pythonOracle';
import type { CodeExample, Exercise } from '@/lib/types';

const codeModules = import.meta.glob<Record<string, unknown>>('./*/*/code.ts', { eager: true });
const quizModules = import.meta.glob<Record<string, unknown>>('./*/*/quiz.ts', { eager: true });
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

const examples = Object.values(codeModules)
  .flatMap((m) => Object.values(m))
  .filter((v): v is CodeExample => isObject(v) && typeof v.expectedOutput === 'string');
const exercises = Object.values(quizModules)
  .flatMap((m) => Object.values(m))
  .filter((v): v is Exercise => isObject(v) && Array.isArray(v.hints) && typeof v.tests === 'string');

const uses = (code: string, name: string) => new RegExp(`^\\s*(import|from)\\s+${name}\\b`, 'm').test(code);
const TORCH_PYTHON = process.env.TORCH_PYTHON;

/**
 * Known differences between CPython on a 64-bit computer and Pyodide, applied to CPython's output before
 * comparing. Lessons show the browser's output. NumPy's default integer is 64-bit here but 32-bit in
 * Pyodide (WebAssembly is 32-bit), so examples that print the default integer dtype list their id here.
 */
export const CPYTHON_DIFFERENCES: Record<string, (out: string) => string> = {};

const work = mkdtempSync(path.join(tmpdir(), 'mlp-python-'));
function run(python: string, code: string): { out: string; ok: boolean } {
  const file = path.join(work, 'run.py');
  writeFileSync(file, code);
  try {
    return { out: execFileSync(python, [file], { encoding: 'utf8', cwd: work, stdio: 'pipe' }), ok: true };
  } catch (e) {
    return { out: String((e as { stderr?: string }).stderr ?? e), ok: false };
  }
}
const canRunHere = (code: string) =>
  !uses(code, 'torch') && ['numpy', 'pandas', 'matplotlib', 'scipy'].every((m) => !uses(code, m) || hasModule(m));

describe.skipIf(!hasPython)('Python course examples', () => {
  it('found the examples and exercises', () => {
    expect(examples.length).toBeGreaterThan(0);
    expect(exercises.length).toBeGreaterThan(0);
  });

  for (const ex of examples) {
    const torch = uses(ex.source, 'torch');
    const skip = torch ? !TORCH_PYTHON : !canRunHere(ex.source);
    it.skipIf(skip)(`${ex.id} prints its expectedOutput`, () => {
      if (!torch) expect(ex.run, `${ex.id} should run in the browser`).toBe('pyodide');
      const r = run(torch ? TORCH_PYTHON! : 'python3', ex.source);
      expect(r.ok, r.out).toBe(true);
      const out = (CPYTHON_DIFFERENCES[ex.id] ?? ((o: string) => o))(r.out);
      expect(out.replace(/\n$/, '')).toBe(ex.expectedOutput);
    });
  }

  for (const ex of exercises)
    it.skipIf(!canRunHere(ex.solution + (ex.tests ?? '')))(`${ex.id}: the solution passes and the starter fails`, () => {
      const solved = run('python3', `${ex.solution}\n${ex.tests}`);
      expect(solved.ok, solved.out).toBe(true);
      expect(run('python3', `${ex.starter ?? ''}\n${ex.tests}`).ok).toBe(false);
    });

  const fixtureDir = path.resolve('src/lib/pycourse/fixtures');
  const scripts = readdirSync(fixtureDir).filter((f) => f.endsWith('.py') && !f.startsWith('_'));
  for (const script of scripts)
    it(`fixture ${script} matches a fresh run`, () => {
      const out = execFileSync('python3', [path.join(fixtureDir, script), '--check'], { encoding: 'utf8' });
      expect(out.trim()).toBe('ok');
    });
});

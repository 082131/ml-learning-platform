// Every hands-on reference solution passes all of its graded checks under CPython, and every starter fails each one.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { hasPython } from '@/lib/foundations/pythonOracle';
import { exams } from './index';

const work = mkdtempSync(path.join(tmpdir(), 'mlp-exam-'));
function cpython(code: string): { ok: boolean; err: string } {
  const file = path.join(work, 'run.py');
  writeFileSync(file, code);
  try {
    execFileSync('python3', [file], { stdio: 'pipe', cwd: work, timeout: 30_000 });
    return { ok: true, err: '' };
  } catch (e) {
    return { ok: false, err: String((e as { stderr?: Buffer }).stderr ?? e) };
  }
}

describe.skipIf(!hasPython)('hands-on tasks under CPython', () => {
  for (const exam of Object.values(exams))
    for (const task of exam.handsOn.tasks)
      for (const check of task.checks)
        it(`${task.id} · ${check.name}`, () => {
          const sol = cpython(`${task.solution}\n${check.tests}`);
          expect(sol.ok, sol.err).toBe(true);
          expect(cpython(`${task.starter}\n${check.tests}`).ok, 'the starter must not pass').toBe(false);
        });
});

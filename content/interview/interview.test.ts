// Content checks for interview prep: the question bank is complete and well formed, and every coding screen's
// reference solution passes its checks under CPython while every starter fails them.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { taskPoints } from '@/lib/exam/engine';
import { hasModule, hasPython } from '@/lib/foundations/pythonOracle';
import { questions, roles, screens, sources } from './index';

const MIN_PER_ROLE = 8;
const SCREEN_POINTS = 100;

describe('interview question bank', () => {
  it('has unique ids and a known role for every question', () => {
    const ids = new Set(questions.map((q) => q.id));
    expect(ids.size).toBe(questions.length);
    const known = new Set(roles.map((r) => r.id));
    for (const q of questions) expect(known.has(q.role), q.id).toBe(true);
  });

  it(`has at least ${MIN_PER_ROLE} questions per role, with a system-design question for each track`, () => {
    for (const r of roles) {
      const mine = questions.filter((q) => q.role === r.id);
      expect(mine.length, r.id).toBeGreaterThanOrEqual(MIN_PER_ROLE);
      if (r.id === 'behavioral') expect(mine.every((q) => q.kind === 'behavioral')).toBe(true);
      else
        expect(
          mine.some((q) => q.kind === 'system-design'),
          r.id,
        ).toBe(true);
    }
  });

  it('gives every question a full model answer, a checklist, red flags and follow-ups', () => {
    for (const q of questions) {
      expect(q.prompt.length, q.id).toBeGreaterThan(30);
      expect(q.answer.split(/\s+/).length, `${q.id} answer is too short`).toBeGreaterThanOrEqual(90);
      expect(q.covers.length, q.id).toBeGreaterThanOrEqual(3);
      expect(q.redFlags.length, q.id).toBeGreaterThanOrEqual(2);
      expect(q.followUps.length, q.id).toBeGreaterThanOrEqual(2);
      expect((q.answer.match(/`/g) ?? []).length % 2, `${q.id} has an unclosed code span`).toBe(0);
    }
  });

  it('lists its sources with links', () => {
    expect(sources.length).toBeGreaterThanOrEqual(4);
    for (const s of sources) expect(s.url).toMatch(/^https:\/\//);
  });
});

describe('coding screens', () => {
  it('each has three tasks worth 100 points and unique ids', () => {
    const ids = new Set<string>();
    for (const s of screens) {
      expect(s.tasks, s.id).toHaveLength(3);
      expect(
        s.tasks.reduce((sum, t) => sum + taskPoints(t), 0),
        s.id,
      ).toBe(SCREEN_POINTS);
      for (const t of s.tasks) {
        expect(ids.has(t.id), t.id).toBe(false);
        ids.add(t.id);
        expect(new Set(t.checks.map((c) => c.name)).size, t.id).toBe(t.checks.length);
      }
    }
  });
});

const work = mkdtempSync(path.join(tmpdir(), 'mlp-interview-'));
function cpython(code: string): { ok: boolean; err: string } {
  const file = path.join(work, 'run.py');
  writeFileSync(file, code);
  try {
    execFileSync('python3', [file], { stdio: 'pipe', cwd: work, timeout: 60_000 });
    return { ok: true, err: '' };
  } catch (e) {
    return { ok: false, err: String((e as { stderr?: Buffer }).stderr ?? e) };
  }
}

describe.skipIf(!hasPython || !hasModule('numpy'))('coding screen tasks under CPython', () => {
  for (const screen of screens)
    for (const task of screen.tasks)
      for (const check of task.checks)
        it(`${task.id} · ${check.name}`, () => {
          const sol = cpython(`${task.solution}\n${check.tests}`);
          expect(sol.ok, sol.err).toBe(true);
          expect(cpython(`${task.starter}\n${check.tests}`).ok, 'the starter must not pass').toBe(false);
        });
});

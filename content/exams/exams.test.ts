// Content checks for every certification exam: blueprint counts, ids, "choose N" wording, hands-on points,
// and the answer-length balance that stops the longest option from giving the answer away.
import { describe, expect, it } from 'vitest';
import { analyzeBalance } from '@/lib/exam/balance';
import { chooseCount, taskPoints } from '@/lib/exam/engine';
import { exams } from './index';

const QUESTIONS_PER_EXAM = 100;
const HANDS_ON_POINTS = 100;

for (const exam of Object.values(exams)) {
  describe(`${exam.track} exam`, () => {
    it(`has ${QUESTIONS_PER_EXAM} items matching the blueprint`, () => {
      expect(exam.questions).toHaveLength(QUESTIONS_PER_EXAM);
      for (const d of exam.domains)
        expect(exam.questions.filter((q) => q.domain === d.id).length, d.id).toBe(d.count);
      const ids = new Set(exam.domains.map((d) => d.id));
      for (const q of exam.questions) expect(ids.has(q.domain), q.id).toBe(true);
    });

    it('has well-formed items', () => {
      const seen = new Set<string>();
      for (const q of exam.questions) {
        expect(seen.has(q.id), `duplicate ${q.id}`).toBe(false);
        seen.add(q.id);
        expect(q.id.startsWith(`${exam.track}-`), q.id).toBe(true);
        expect(q.options.length, q.id).toBeGreaterThanOrEqual(q.answer.length > 1 ? 5 : 4);
        expect(new Set(q.options).size, `${q.id} repeats an option`).toBe(q.options.length);
        expect(new Set(q.answer).size, q.id).toBe(q.answer.length);
        for (const a of q.answer) expect(q.options[a], q.id).toBeDefined();
        expect(chooseCount(q.prompt), `${q.id}: "(Choose N.)" must match the answer count`).toBe(
          q.answer.length,
        );
        expect(q.explain.length, `${q.id} needs an explanation`).toBeGreaterThan(40);
      }
    });

    it('does not give answers away by length', () => {
      expect(analyzeBalance(exam.questions).issues).toEqual([]);
    });

    it(`has a ${HANDS_ON_POINTS}-point hands-on part`, () => {
      const tasks = exam.handsOn.tasks;
      expect(tasks.reduce((s, t) => s + taskPoints(t), 0)).toBe(HANDS_ON_POINTS);
      expect(new Set(tasks.map((t) => t.id)).size).toBe(tasks.length);
      for (const t of tasks) expect(new Set(t.checks.map((c) => c.name)).size, t.id).toBe(t.checks.length);
    });
  });
}

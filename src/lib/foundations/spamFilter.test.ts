import { describe, expect, it } from 'vitest';
import { hasPython, runPython } from './pythonOracle';
import {
  LEARNED_THRESHOLD,
  NEW_EMAILS,
  SCORES,
  SPAM_SOURCE,
  TRAIN_EMAILS,
  computeSpam,
  learnScores,
  parseKeywords,
  scoreEmail,
  spamSlots,
  words,
  type SpamState,
} from './spamFilter';
import { fillTemplate } from './template';

const start: SpamState = { keywords: 'free, prize', threshold: 1, email: 'free lunch today' };

describe('spam filter', () => {
  it('learns word scores by counting spam and ham emails', () => {
    // free: in 4 spam emails (1, 2, 3, 5) and 1 ham email, so 4 − 1 = 3
    expect(SCORES.get('free')).toBe(3);
    expect(SCORES.get('claim')).toBe(3);
    expect(SCORES.get('today')).toBe(-1); // 1 spam, 2 ham
    expect(SCORES.get('the')).toBe(-2);
    expect(SCORES.get('your')).toBe(0); // 1 spam, 1 ham
    // A word counts once per email.
    expect(learnScores([{ text: 'buy buy buy', label: 'spam' }]).get('buy')).toBe(1);
  });

  it('scores an email as the sum of its word scores', () => {
    // win 1 + a 1 + free 3 + prize 2 + now 3 = 10
    expect(scoreEmail('win a free prize now', SCORES)).toBe(10);
    // free 3 + lunch −1 + today −1 = 1, and unknown words count 0
    expect(scoreEmail('free lunch today zebra', SCORES)).toBe(1);
  });

  it('learns the middle threshold among those with the fewest training mistakes', () => {
    // Highest ham score is −3, lowest spam score is 6: every t from −3 to 5 is perfect; the middle is 1.
    expect(LEARNED_THRESHOLD).toBe(1);
  });

  it('compares the hand-written rule and the learned filter', () => {
    const r = computeSpam(start);
    expect(r.rule).toEqual({ email: true, train: 9, new: 4 });
    expect(r.learned).toEqual({ email: false, train: 10, new: 4 });
    expect(r.email.score).toBe(1);
    expect(TRAIN_EMAILS).toHaveLength(10);
    expect(NEW_EMAILS).toHaveLength(6);
  });

  it('cleans input the way the Python code reads it', () => {
    expect(words('  FREE  Money!! now ')).toEqual(['free', 'money', 'now']);
    expect(parseKeywords('Free, prize,, free')).toEqual(['free', 'prize']);
    expect(spamSlots({ ...start, keywords: '' }).keywords).toBe('set()');
  });
});

describe.skipIf(!hasPython)('spam filter against CPython', () => {
  const states: SpamState[] = [
    start,
    { keywords: 'claim', threshold: -3, email: 'claim your prize today' },
    { keywords: '', threshold: 5, email: '' },
    { keywords: 'win, cheap, money', threshold: 0, email: 'cheap money now now now' },
  ];
  it.each(states)('prints what the readout says for %o', (s) => {
    const out = runPython(fillTemplate(SPAM_SOURCE, spamSlots(s)))
      .trim()
      .split('\n');
    const r = computeSpam(s);
    expect(out).toEqual([r.rule.email ? 'True' : 'False', r.learned.email ? 'True' : 'False']);
  });

  it('learns the same scores as Python', () => {
    const code = `${fillTemplate(SPAM_SOURCE, spamSlots(start))}\nimport json\nprint(json.dumps(scores))`;
    const pyScores = JSON.parse(runPython(code).trim().split('\n').at(-1)!) as Record<string, number>;
    expect(pyScores).toEqual(Object.fromEntries(SCORES));
  });
});

import { describe, expect, it } from 'vitest';
import { runAgent } from '@/lib/ai/agent';
import { lumenDocs } from '@/lib/ai/lumen';
import { validateExample } from '@/lib/code/validate';
import { agent, agentCode, loopRunner, playground, scenarios } from './code';

const run = (id: string, maxSteps = 6, maxToolErrors = 1) =>
  runAgent(
    scenarios.find((s) => s.id === id)!,
    lumenDocs,
    { maxSteps, maxToolErrors },
  );
const toolResults = (id: string, ...limits: number[]) =>
  run(id, ...limits).flatMap((e) => (e.kind === 'tool' ? [e.result] : []));

describe('tool-calling lesson', () => {
  it('has valid code examples', () => {
    expect(validateExample(agentCode)).toEqual([]);
    expect(validateExample(loopRunner)).toEqual([]);
  });

  it('computes 17.5% of 2,480 as 434, as the scripted answer says', () => {
    expect(toolResults('percent')).toEqual([{ ok: true, content: '434' }]);
  });

  it('finds the per-member storage the team-storage answer relies on', () => {
    const [search, calc] = toolResults('team-storage');
    expect(search).toMatchObject({ ok: true });
    expect(search?.ok && search.content).toContain('Each Team member gets 100 GB of storage');
    expect(calc).toEqual({ ok: true, content: '1200' });
  });

  it('fails on ×, retries with *, and gets $1,152 from the searched price and discount', () => {
    const [search, bad, good] = toolResults('annual-cost');
    expect(search?.ok && search.content).toContain('$10 per member per month');
    expect(search?.ok && search.content).toContain('20% discount');
    expect(bad).toMatchObject({ ok: false });
    expect(!bad!.ok && bad!.error).toContain('×');
    expect(good).toEqual({ ok: true, content: '1152' });
    expect(run('annual-cost').at(-1)).toMatchObject({ kind: 'stop', reason: 'answer' });
  });

  it('stops after the failed call when no failures are allowed', () => {
    const events = run('annual-cost', 6, 0);
    expect(events.at(-1)).toMatchObject({ kind: 'stop', reason: 'tool-errors' });
    expect(events.filter((e) => e.kind === 'tool')).toHaveLength(2);
  });

  it('stops at the turn limit before the answer', () => {
    expect(run('annual-cost', 3).at(-1)).toMatchObject({ kind: 'stop', reason: 'step-limit' });
  });

  it('starts the step-through at the question and the playground on the failing expression', () => {
    const r = agent.compute(agent.initial);
    expect(r.shown).toBe(1);
    expect(r.events[0]).toMatchObject({ kind: 'user' });
    expect(playground.compute(playground.initial)).toMatchObject({ ok: false });
  });

  it('behaves as the playground prose says', () => {
    const call = (tool: string, args: string) => playground.compute({ tool, args });
    expect(call('calculator', '{"expression": "12 * 10"}')).toEqual({ ok: true, content: '120' });
    expect(call('calculator', '{"expression": "1 / 0"}')).toEqual({ ok: false, error: 'Division by zero' });
    const misspelled = call('calculator', '{"expr": "12 * 10"}');
    expect(!misspelled.ok && misspelled.error).toMatch(
      /missing required argument "expression".*unknown argument "expr"/,
    );
    const refund = call('search_docs', '{"query": "refund monthly plan"}');
    expect(refund.ok && refund.content).toContain('(Refunds and cancellations)');
    expect(call('search_docs', '{"query": "handwriting"}')).toEqual({
      ok: true,
      content: 'No matching passages.',
    });
  });
});

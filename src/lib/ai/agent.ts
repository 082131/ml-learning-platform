import type { ExperimentDef } from '../types';
import type { Doc } from './chunking';
import { runTool, type ToolResult } from './tools';

export interface ToolCall {
  tool: string;
  args: Record<string, unknown>;
}

/** One scripted model turn: either a tool call (with an optional thought shown to the user) or a final answer. */
export type ModelTurn = { kind: 'call'; say?: string; call: ToolCall } | { kind: 'answer'; text: string };

export interface Scenario {
  id: string;
  title: string;
  question: string;
  /** The model's turns in order. Written for the lesson: no model runs. */
  script: ModelTurn[];
}

export type AgentEvent =
  | { kind: 'user'; text: string }
  | { kind: 'model'; step: number; turn: ModelTurn }
  | { kind: 'tool'; step: number; call: ToolCall; result: ToolResult }
  | { kind: 'stop'; reason: 'answer' | 'tool-errors' | 'step-limit' | 'script-ended'; text: string };

export interface AgentLimits {
  /** Model turns allowed before the loop gives up. */
  maxSteps: number;
  /** Failed tool calls tolerated; one more stops the loop. */
  maxToolErrors: number;
}

/**
 * The agent loop. The model is a script, but the loop logic and every tool call are real: tools run
 * in the browser, their results (or errors) are what the next model turn would read, and the limits
 * decide when the loop stops. Mirrors run_agent in the lesson's Python.
 */
export function runAgent(s: Scenario, docs: readonly Doc[], limits: AgentLimits): AgentEvent[] {
  const events: AgentEvent[] = [{ kind: 'user', text: s.question }];
  let errors = 0;
  for (let step = 0; step < limits.maxSteps; step++) {
    const turn = s.script[step];
    if (!turn) {
      events.push({ kind: 'stop', reason: 'script-ended', text: 'Stopped: the scripted model has no more turns.' });
      return events;
    }
    events.push({ kind: 'model', step, turn });
    if (turn.kind === 'answer') {
      events.push({ kind: 'stop', reason: 'answer', text: turn.text });
      return events;
    }
    const result = runTool(docs, turn.call.tool, turn.call.args);
    events.push({ kind: 'tool', step, call: turn.call, result });
    if (!result.ok && ++errors > limits.maxToolErrors) {
      events.push({
        kind: 'stop',
        reason: 'tool-errors',
        text: `Stopped: ${errors} failed tool call${errors > 1 ? 's' : ''}, more than the limit of ${limits.maxToolErrors}.`,
      });
      return events;
    }
  }
  events.push({ kind: 'stop', reason: 'step-limit', text: `Stopped: reached the limit of ${limits.maxSteps} model turns.` });
  return events;
}

export interface AgentState extends AgentLimits {
  scenario: string;
  /** How many events are revealed in the step-through (1 = just the question). */
  shown: number;
}

export interface AgentResult {
  scenario: Scenario;
  events: AgentEvent[];
  shown: number;
}

export function agentExperiment(id: string, scenarios: Scenario[], docs: readonly Doc[], initial: AgentState): ExperimentDef<AgentState, AgentResult> {
  const find = (sid: string) => {
    const s = scenarios.find((x) => x.id === sid);
    if (!s) throw new Error(`unknown scenario "${sid}"`);
    return s;
  };
  const limit = (key: 'maxSteps' | 'maxToolErrors', label: string, min: number, max: number) =>
    ({
      kind: 'slider',
      id: key,
      label,
      min,
      max,
      get: (s: AgentState) => s[key],
      set: (s: AgentState, v: number) => ({ ...s, [key]: v, shown: 1 }),
    }) as const;
  return {
    id,
    initial,
    controls: [
      {
        kind: 'select',
        id: 'scenario',
        label: 'Task',
        options: scenarios.map((s) => ({ value: s.id, label: s.title })),
        get: (s) => s.scenario,
        set: (s, v) => ({ ...s, scenario: v, shown: 1 }),
      },
      limit('maxSteps', 'Max model turns', 1, 6),
      limit('maxToolErrors', 'Failed tool calls allowed', 0, 2),
    ],
    compute: (s) => {
      const scenario = find(s.scenario);
      const events = runAgent(scenario, docs, s);
      return { scenario, events, shown: Math.min(Math.max(1, s.shown), events.length) };
    },
    readout: (_, r) => {
      const stop = r.events.at(-1) as Extract<AgentEvent, { kind: 'stop' }>;
      const tools = r.events.filter((e): e is Extract<AgentEvent, { kind: 'tool' }> => e.kind === 'tool');
      return [
        { label: 'Outcome', value: stop.reason === 'answer' ? 'answered' : stop.text, status: stop.reason === 'answer' ? 'ok' : 'error' },
        { label: 'Model turns', value: String(r.events.filter((e) => e.kind === 'model').length) },
        { label: 'Tool calls (failed)', value: `${tools.length} (${tools.filter((t) => !t.result.ok).length})` },
      ];
    },
  };
}

/** Tool playground: call a tool yourself with JSON arguments. */
export interface PlaygroundState {
  tool: string;
  args: string;
}

export function toolPlayground(id: string, docs: readonly Doc[], initial: PlaygroundState): ExperimentDef<PlaygroundState, ToolResult> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'select',
        id: 'tool',
        label: 'Tool',
        options: [
          { value: 'calculator', label: 'calculator' },
          { value: 'search_docs', label: 'search_docs' },
        ],
        get: (s) => s.tool,
        set: (s, v) => ({ ...s, tool: v }),
      },
      { kind: 'text', id: 'args', label: 'Arguments (JSON)', maxLength: 200, get: (s) => s.args, set: (s, v) => ({ ...s, args: v }) },
    ],
    compute: (s) => {
      let args: unknown;
      try {
        args = JSON.parse(s.args);
      } catch {
        return { ok: false, error: 'arguments are not valid JSON' };
      }
      return runTool(docs, s.tool, args);
    },
    readout: (s, r) => [
      {
        label: `${s.tool} returned`,
        value: r.ok ? r.content : `error: ${r.error}`,
        status: r.ok ? 'ok' : 'error',
      },
    ],
  };
}

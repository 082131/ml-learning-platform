import type { ExperimentDef, ReadoutItem } from '../types';
import { SCENARIOS, type Scenario } from './scenarios';
import { abbrev, currentBranch, headId, runScript, type CommandOutput, type Repo, type RunResult } from './sim';

/** The learner's commands after the scenario's setup. */
export interface SandboxState {
  commands: string[];
}

export interface SandboxResult {
  scenario: Scenario;
  repo: Repo;
  /** Outputs of the learner's commands only. */
  outputs: CommandOutput[];
  /** How many of the guided steps the learner has followed exactly, in order. */
  guided: number;
}

const setupCache = new Map<string, RunResult>();

function setupRun(s: Scenario): RunResult {
  let r = setupCache.get(s.id);
  if (!r) {
    r = runScript(s.setup);
    setupCache.set(s.id, r);
  }
  return r;
}

export function runSandbox(scenarioId: string, st: SandboxState): SandboxResult {
  const scenario = SCENARIOS[scenarioId] ?? fail(scenarioId);
  const res = runScript(st.commands, setupRun(scenario).repo);
  let guided = 0;
  while (guided < st.commands.length && st.commands[guided] === scenario.suggested[guided]?.command) guided++;
  return { scenario, repo: res.repo, outputs: res.outputs, guided };
}

function fail(id: string): never {
  throw new Error(`unknown Git sandbox scenario "${id}"`);
}

/** The next guided step, if the learner has followed every step so far. */
export function nextStep(r: SandboxResult, st: SandboxState) {
  return r.guided === st.commands.length ? r.scenario.suggested[r.guided] : undefined;
}

export function headLabel(repo: Repo): string {
  const id = headId(repo);
  const b = currentBranch(repo);
  if (b) return id ? `${b} at ${abbrev(id)}` : `${b} (no commits yet)`;
  return `detached at ${abbrev(id!)}`;
}

export function sandboxReadout(_s: SandboxState, r: SandboxResult): ReadoutItem[] {
  const last = r.outputs[r.outputs.length - 1];
  const items: ReadoutItem[] = [
    { label: 'HEAD', value: headLabel(r.repo) },
    {
      label: 'Branches',
      value: Object.entries(r.repo.branches)
        .sort()
        .map(([b, id]) => `${b} ${abbrev(id)}`)
        .join(', ') || 'none yet',
    },
  ];
  if (r.repo.op) items.push({ label: 'In progress', value: `${r.repo.op.kind}${r.repo.conflicts.length ? `, conflicts in ${r.repo.conflicts.join(', ')}` : ''}`, status: r.repo.conflicts.length ? 'error' : 'ok' });
  if (last) items.push({ label: `$ ${last.command}`, value: last.output || '(no output)', status: last.ok ? 'ok' : 'error' });
  return items;
}

export function gitSandboxExperiment(id: string, scenarioId: string): ExperimentDef<SandboxState, SandboxResult> {
  if (!SCENARIOS[scenarioId]) fail(scenarioId);
  return {
    id,
    initial: { commands: [] },
    controls: [],
    compute: (s) => runSandbox(scenarioId, s),
    readout: sandboxReadout,
    resultSource: 'simulated in your browser; commit ids match real Git with the same author and dates',
  };
}

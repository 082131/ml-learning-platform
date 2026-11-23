import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge, Button } from '@/components/ui';
import { headLabel, nextStep, type SandboxResult, type SandboxState } from '@/lib/git/sandbox';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './GitTrack.module.css';

/**
 * A terminal for the Git sandbox: type a command (or run the next guided step) and see what Git prints. The
 * commit graph and the three areas, placed in the same Experiment, update from the same state.
 */
export function GitSandbox({ guide = true }: { guide?: boolean }) {
  const { state, result, update } = useExperimentContext<SandboxState, SandboxResult>('GitSandbox');
  const [line, setLine] = useState('');
  const inputId = useId();
  const logRef = useRef<HTMLOListElement>(null);
  const step = nextStep(result, state);
  const run = (cmd: string) => {
    const c = cmd.trim();
    if (!c) return;
    update((st) => ({ commands: [...st.commands, c] }));
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    run(line);
    setLine('');
  };
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [state.commands.length]);
  const failed = result.outputs.filter((o) => !o.ok).length;
  return (
    <VizFrame
      title={`Git sandbox: ${result.scenario.title}`}
      badge={<Badge tone="simulated">Simulated, real hashes</Badge>}
      caption={`${state.commands.length} command${state.commands.length === 1 ? '' : 's'} run${
        failed ? `, ${failed} refused by Git` : ''
      }. HEAD: ${headLabel(result.repo)}.`}
      table={
        <VizTable
          caption="Commands and what Git printed"
          columns={['command', 'result', 'output']}
          rows={result.outputs.map((o) => [o.command, o.ok ? 'ok' : 'error', o.output || '(none)'])}
        />
      }
    >
      <div className={s.terminal}>
        <ol ref={logRef} className={s.log} aria-live="polite" aria-label="Terminal output">
          {result.outputs.length === 0 && (
            <li className={s.hint}>
              {result.scenario.setup.length
                ? 'The repository is set up. Type a Git command below, or run the guided steps.'
                : 'An empty repository: git init has run. Type a command below, or run the guided steps.'}
            </li>
          )}
          {result.outputs.map((o, i) => (
            <li key={i} data-ok={o.ok}>
              <span className={s.prompt}>
                <span aria-hidden="true">$ </span>
                {o.command}
              </span>
              {o.output && <pre className={s.out}>{o.output}</pre>}
              {!o.ok && <span className={s.refused}>Git refused this command (exit status 1). Nothing else changed.</span>}
            </li>
          ))}
        </ol>
        <form className={s.inputRow} onSubmit={submit}>
          <label htmlFor={inputId} className={s.promptLabel}>
            $
          </label>
          <input
            id={inputId}
            className={s.input}
            value={line}
            onChange={(e) => setLine(e.target.value)}
            placeholder="git status"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-label="Command"
          />
          <Button type="submit" size="sm">
            Run
          </Button>
        </form>
        {guide && (
          <div className={s.guide}>
            {step ? (
              <>
                <Button size="sm" variant="primary" onClick={() => run(step.command)}>
                  Next step: <code>{step.command}</code>
                </Button>
                {step.why && <p className={s.why}>{step.why}</p>}
              </>
            ) : result.guided === result.scenario.suggested.length ? (
              <p className={s.why}>Guided steps done. Keep experimenting: every command you type is replayed from the start, so Undo is always safe.</p>
            ) : (
              <p className={s.why}>You left the guided path. Undo back to step {result.guided + 1}, or keep exploring.</p>
            )}
            <span className={s.guideTools}>
              <Button size="sm" variant="ghost" disabled={!state.commands.length} onClick={() => update((st) => ({ commands: st.commands.slice(0, -1) }))}>
                Undo last command
              </Button>
            </span>
          </div>
        )}
      </div>
    </VizFrame>
  );
}

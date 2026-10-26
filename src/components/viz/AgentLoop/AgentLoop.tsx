import type { AgentEvent, AgentResult, AgentState } from '@/lib/ai/agent';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge, Button } from '@/components/ui';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './AgentLoop.module.css';

const args = (a: Record<string, unknown>) => JSON.stringify(a);

function Event({ event }: { event: AgentEvent }) {
  switch (event.kind) {
    case 'user':
      return (
        <>
          <h4 className={s.head}>User</h4>
          <p className={s.text}>{event.text}</p>
        </>
      );
    case 'model':
      return (
        <>
          <h4 className={s.head}>
            Model turn {event.step + 1} <Badge tone="simulated">Scripted model turn</Badge>
          </h4>
          {event.turn.kind === 'answer' ? (
            <p className={s.text}>{event.turn.text}</p>
          ) : (
            <>
              {event.turn.say && <p className={s.text}>{event.turn.say}</p>}
              <code className={s.call}>
                tool_use: {event.turn.call.tool}({args(event.turn.call.args)})
              </code>
            </>
          )}
        </>
      );
    case 'tool':
      return (
        <>
          <h4 className={s.head}>
            Tool result: {event.call.tool} <Badge tone="ok">Ran in your browser</Badge>
          </h4>
          <pre className={s.result} tabIndex={0}>
            {event.result.ok ? event.result.content : `is_error: true\n${event.result.error}`}
          </pre>
        </>
      );
    case 'stop':
      return (
        <>
          <h4 className={s.head}>{event.reason === 'answer' ? 'Final answer' : 'Loop stopped'}</h4>
          <p className={s.text}>{event.text}</p>
        </>
      );
  }
}

const label = (e: AgentEvent) =>
  e.kind === 'user'
    ? 'User'
    : e.kind === 'model'
      ? `Model turn ${e.step + 1} (scripted)`
      : e.kind === 'tool'
        ? `Tool ${e.call.tool} (ran)`
        : 'Stop';

const summary = (e: AgentEvent) =>
  e.kind === 'user' || e.kind === 'stop'
    ? e.text
    : e.kind === 'model'
      ? e.turn.kind === 'answer'
        ? e.turn.text
        : `${e.turn.call.tool}(${args(e.turn.call.args)})`
      : e.result.ok
        ? e.result.content
        : `error: ${e.result.error}`;

/** Steps through the agent loop one event at a time: user, model turns, real tool results, stop. */
export function AgentLoop() {
  const { result, update } = useExperimentContext<AgentState, AgentResult>('AgentLoop');
  const { events, shown } = result;
  const visible = events.slice(0, shown);
  const done = shown >= events.length;
  const show = (n: number) => update((st) => ({ ...st, shown: n }));
  return (
    <VizFrame
      title={`Agent loop: ${result.scenario.title}`}
      caption="Model turns are a script written for this lesson. The tool calls are real: the calculator and the help-center search run in your browser on the arguments shown, and a failed call returns its error to the model."
      table={
        <VizTable
          caption="Every event of the run"
          columns={['Event', 'Content']}
          rows={events.map((e) => [label(e), summary(e)])}
        />
      }
    >
      <ol className={s.events}>
        {visible.map((e, i) => (
          <li
            key={i}
            className={s.event}
            data-event={e.kind}
            data-status={
              e.kind === 'tool' ? (e.result.ok ? 'ok' : 'error') : e.kind === 'stop' ? e.reason : undefined
            }
          >
            <Event event={e} />
          </li>
        ))}
      </ol>
      <div className={s.controls}>
        <Button variant="primary" onClick={() => show(shown + 1)} disabled={done}>
          Next step
        </Button>
        <Button onClick={() => show(events.length)} disabled={done}>
          Show all
        </Button>
        <Button variant="ghost" onClick={() => show(1)} disabled={shown <= 1}>
          Restart
        </Button>
        <span className={s.count} aria-live="polite">
          Step {shown} of {events.length}
        </span>
      </div>
    </VizFrame>
  );
}

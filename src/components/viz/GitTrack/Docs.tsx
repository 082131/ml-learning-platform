import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Button } from '@/components/ui';
import type { ParsedDoc } from '@/lib/git/docstring';
import { KINDS, README_SECTIONS, SNIPPETS, type Kind, type ReadmeState, type SorterState } from '@/lib/git/docsKinds';
import { DOC_EXAMPLES, type DocState } from '@/lib/git/experiments';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './GitTrack.module.css';

/** A docstring next to the API reference entry a docs generator would build from it. */
export function DocstringView() {
  const { state, result: r } = useExperimentContext<DocState, { doc: ParsedDoc; missing: string[]; extra: string[] }>('DocstringView');
  const ex = DOC_EXAMPLES[state.example]!;
  const d = r.doc;
  const problems = [...r.missing.map((p) => `parameter "${p}" is not documented`), ...r.extra.map((p) => `"${p}" is documented but not in the signature`)];
  return (
    <VizFrame
      title="Docstring → API reference"
      caption={`${ex.label}: ${d.params.length} parameter${d.params.length === 1 ? '' : 's'} documented${problems.length ? `; ${problems.join('; ')}` : ''}.`}
      table={<VizTable caption="Parsed parameters" columns={['name', 'type', 'description']} rows={d.params.map((p) => [p.name, p.type, p.description])} />}
    >
      <div className={s.grid2}>
        <section className={s.panel}>
          <h4 className={s.panelHead}>Source</h4>
          <pre className={s.pre}>{ex.source}</pre>
        </section>
        <section className={s.panel} data-problems={problems.length}>
          <h4 className={s.panelHead}>Rendered reference</h4>
          <p className={s.mono}>
            <strong>split</strong>({ex.signature.join(', ')})
          </p>
          <p>{d.summary}</p>
          {d.description && <p>{d.description}</p>}
          {d.params.length > 0 && (
            <>
              <p className={s.panelHead}>Parameters</p>
              <ul className={s.list}>
                {d.params.map((p) => (
                  <li key={p.name} data-ok={!r.extra.includes(p.name)}>
                    <code className={s.mono}>{p.name}</code>
                    {p.type && ` (${p.type})`}: {p.description}
                  </li>
                ))}
              </ul>
            </>
          )}
          {d.returns && (
            <>
              <p className={s.panelHead}>Returns</p>
              <p>
                {d.returns.type && <code className={s.mono}>{d.returns.type}</code>} {d.returns.description}
              </p>
            </>
          )}
          {d.raises.length > 0 && (
            <>
              <p className={s.panelHead}>Raises</p>
              <ul className={s.list}>
                {d.raises.map((x) => (
                  <li key={x.type}>
                    <code className={s.mono}>{x.type}</code>: {x.description}
                  </li>
                ))}
              </ul>
            </>
          )}
          {d.examples.length > 0 && <pre className={s.pre}>{d.examples.join('\n')}</pre>}
          {problems.length > 0 && (
            <ul className={s.list}>
              {problems.map((p) => (
                <li key={p} data-ok="false">
                  ✗ {p}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </VizFrame>
  );
}

/** Sort eight documentation pages into the four Diataxis kinds and get feedback on each. */
export function DiataxisSorter() {
  const { state, update } = useExperimentContext<SorterState, { answered: number; correct: number }>('DiataxisSorter');
  const done = SNIPPETS.filter((x) => state.answers[x.id]);
  return (
    <VizFrame
      title="Which kind of page is this?"
      caption={`${done.length} of ${SNIPPETS.length} sorted, ${done.filter((x) => state.answers[x.id] === x.kind).length} matching Diataxis.`}
      table={<VizTable caption="Pages and their kinds" columns={['page', 'your answer', 'Diataxis kind']} rows={SNIPPETS.map((x) => [x.text, state.answers[x.id] ? KINDS[state.answers[x.id]!] : '', state.answers[x.id] ? KINDS[x.kind] : '(answer first)'])} />}
    >
      <ol className={s.sorter}>
        {SNIPPETS.map((x) => {
          const a = state.answers[x.id];
          return (
            <li key={x.id} className={s.panel} data-snippet={x.id}>
              <p>{x.text}</p>
              <div className={s.kindButtons} role="group" aria-label={`Kind of page ${SNIPPETS.indexOf(x) + 1}`}>
                {(Object.keys(KINDS) as Kind[]).map((k) => (
                  <Button key={k} size="sm" variant={a === k ? 'primary' : 'secondary'} aria-pressed={a === k} onClick={() => update((st) => ({ answers: { ...st.answers, [x.id]: k } }))}>
                    {KINDS[k].split(':')[0]}
                  </Button>
                ))}
              </div>
              {a && (
                <p className={s.feedback} data-ok={a === x.kind}>
                  {a === x.kind ? '✓ ' : `✗ It is a ${(KINDS[x.kind].split(':')[0] ?? '').toLowerCase()}. `}
                  {x.why}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </VizFrame>
  );
}

/** Pick README sections and see the README and the reader questions it still leaves open. */
export function ReadmeBuilder() {
  const { state, result: r, update } = useExperimentContext<ReadmeState, { markdown: string; unanswered: string[] }>('ReadmeBuilder');
  return (
    <VizFrame
      title="Build a README"
      caption={`${state.sections.length} of ${README_SECTIONS.length} sections. ${r.unanswered.length ? `A reader still asks: ${r.unanswered.join(' ')}` : 'Every common reader question is answered.'}`}
      table={<VizTable caption="README sections" columns={['section', 'included', 'question it answers']} rows={README_SECTIONS.map((x) => [x.heading.replace(/^#+ /, ''), state.sections.includes(x.id) ? 'yes' : 'no', x.question])} />}
    >
      <div className={s.grid2}>
        <section className={s.panel}>
          <h4 className={s.panelHead}>Sections</h4>
          <ul className={s.checks}>
            {README_SECTIONS.map((x) => (
              <li key={x.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={state.sections.includes(x.id)}
                    onChange={(e) =>
                      update((st) => ({
                        sections: e.target.checked ? README_SECTIONS.filter((y) => y.id === x.id || st.sections.includes(y.id)).map((y) => y.id) : st.sections.filter((y) => y !== x.id),
                      }))
                    }
                  />{' '}
                  {x.heading.replace(/^#+ /, '')}
                  <span className={s.code}>{x.question}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>
        <section className={s.panel}>
          <h4 className={s.panelHead}>README.md</h4>
          <pre className={s.pre}>{r.markdown || '(empty)'}</pre>
        </section>
      </div>
    </VizFrame>
  );
}

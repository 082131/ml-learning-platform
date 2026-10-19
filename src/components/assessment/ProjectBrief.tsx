import { useProgress, useProgressStore } from '@/app/progress';
import { setProjectItem } from '@/lib/progress/actions';
import type { ProjectBrief as Brief } from '@/lib/types';
import { useLessonId } from '@/components/learning/LessonContext';
import { InlineText } from './InlineText';
import s from './Assessment.module.css';

/** A project brief with a milestone checklist that is saved in this browser (US7). */
export function ProjectBrief({ brief }: { brief: Brief }) {
  const lessonId = useLessonId();
  const store = useProgressStore();
  const checked = useProgress().projects[lessonId] ?? [];
  const done = brief.milestones.filter((_, i) => checked[i]).length;

  return (
    <div className={s.project}>
      <h3 className={s.sub}>Goal</h3>
      <InlineText text={brief.goal} />
      <h3 className={s.sub}>Dataset</h3>
      <InlineText text={brief.dataset} />

      <fieldset className={s.fieldset}>
        <legend className={s.sub}>
          Milestones · {done} of {brief.milestones.length} done
        </legend>
        {brief.milestones.map((m, i) => (
          <label key={m} className={s.option}>
            <input
              type="checkbox"
              checked={!!checked[i]}
              onChange={(e) =>
                store.update((st) =>
                  setProjectItem(st, lessonId, i, e.target.checked, brief.milestones.length),
                )
              }
            />
            <span>{m}</span>
          </label>
        ))}
      </fieldset>

      <h3 className={s.sub}>Rubric</h3>
      <table className={s.rubric}>
        <thead>
          <tr>
            <th scope="col">Criterion</th>
            <th scope="col">What good looks like</th>
          </tr>
        </thead>
        <tbody>
          {brief.rubric.map((r) => (
            <tr key={r.criterion}>
              <th scope="row">{r.criterion}</th>
              <td>{r.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className={s.sub}>Hints</h3>
      {brief.hints.map((h, i) => (
        <details key={i} className={s.details}>
          <summary>Hint {i + 1}</summary>
          <InlineText text={h} />
        </details>
      ))}
    </div>
  );
}

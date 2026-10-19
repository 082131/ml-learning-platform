import { validateExample } from '../code/validate';
import { isExperimentDef, validateExperiment } from '../experiment';
import { validateAssessment } from '../quiz';
import type { CodeExample, Exercise, QuizQuestion } from '../types';

type Modules = Record<string, Record<string, unknown>>;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isExample = (v: unknown): v is CodeExample =>
  isObject(v) &&
  typeof v.source === 'string' &&
  Array.isArray(v.annotations) &&
  typeof v.language === 'string';
const isQuestion = (v: unknown): v is QuizQuestion =>
  isObject(v) && typeof v.type === 'string' && typeof v.prompt === 'string';
const isExercise = (v: unknown): v is Exercise =>
  isObject(v) && Array.isArray(v.hints) && typeof v.solution === 'string';

/** Every value of a module's exports, flattening exported arrays. */
const exportsOf = (mod: Record<string, unknown>) =>
  Object.values(mod).flatMap((v) => (Array.isArray(v) ? v : [v]));

/**
 * Validates lesson `code.ts` and `quiz.ts` modules keyed by path: annotation ranges and drift
 * (validateExample), experiments (validateExperiment) and quiz answers (validateAssessment). Run by `npm run validate` and the content test.
 */
export function validateLessonData(codeModules: Modules, quizModules: Modules): string[] {
  const errors: string[] = [];
  for (const [path, mod] of Object.entries(codeModules)) {
    const examples = exportsOf(mod).filter(isExample);
    const ids = new Set<string>();
    for (const ex of examples) {
      if (ids.has(ex.id)) errors.push(`${path}: duplicate example id "${ex.id}"`);
      ids.add(ex.id);
      errors.push(...validateExample(ex).map((e) => `${path}: ${e}`));
    }
    for (const def of exportsOf(mod).filter(isExperimentDef))
      errors.push(...validateExperiment(def).map((e) => `${path}: ${e}`));
  }
  for (const [path, mod] of Object.entries(quizModules)) {
    const values = exportsOf(mod);
    const found = validateAssessment(values.filter(isQuestion), values.filter(isExercise));
    errors.push(...found.map((e) => `${path}: ${e}`));
  }
  return errors;
}

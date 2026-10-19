import { useProgress, useProgressStore } from '@/app/progress';
import { recordQuiz } from '@/lib/progress/actions';
import { useLessonId } from '@/components/learning/LessonContext';

/** The saved result for one question, and a way to record a new attempt. */
export function useQuizRecord(questionId: string) {
  const lessonId = useLessonId();
  const store = useProgressStore();
  const saved = useProgress().quiz[`${lessonId}#${questionId}`];
  return {
    lessonId,
    saved,
    record: (correct: boolean) => store.update((s) => recordQuiz(s, lessonId, questionId, correct)),
  };
}

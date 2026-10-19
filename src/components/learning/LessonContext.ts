import { createContext, useContext } from 'react';

/** The lesson being rendered, so quizzes, exercises and checklists save progress under its ID. */
export const LessonIdContext = createContext<string>('preview');

export function useLessonId(): string {
  return useContext(LessonIdContext);
}

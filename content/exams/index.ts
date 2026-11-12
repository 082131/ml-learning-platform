import type { TrackId } from '@/lib/types';
import type { ExamDef } from '@/lib/exam/types';
import { mlExam } from './ml';

/** One certification-style exam per track. */
export const exams: Partial<Record<TrackId, ExamDef>> = { ml: mlExam };

export const getExam = (track: string): ExamDef | undefined => exams[track as TrackId];

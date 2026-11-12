import type { TrackId } from '@/lib/types';
import type { ExamDef } from '@/lib/exam/types';
import { aiExam } from './ai';
import { dataExam } from './data';
import { mlExam } from './ml';

/** One certification-style exam per track. */
export const exams: Partial<Record<TrackId, ExamDef>> = { ml: mlExam, data: dataExam, ai: aiExam };

export const getExam = (track: string): ExamDef | undefined => exams[track as TrackId];

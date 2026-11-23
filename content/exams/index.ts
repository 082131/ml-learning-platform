import type { TrackId } from '@/lib/types';
import type { ExamDef } from '@/lib/exam/types';
import { aiExam } from './ai';
import { automationExam } from './automation';
import { dataopsExam } from './dataops';
import { deployExam } from './deploy';
import { gitExam } from './git';
import { dataExam } from './data';
import { inferenceExam } from './inference';
import { mlExam } from './ml';
import { pythonExam } from './python';

/** One certification-style exam per track. */
export const exams: Partial<Record<TrackId, ExamDef>> = {
  ml: mlExam,
  data: dataExam,
  ai: aiExam,
  inference: inferenceExam,
  python: pythonExam,
  dataops: dataopsExam,
  deploy: deployExam,
  git: gitExam,
  automation: automationExam,
};

export const getExam = (track: string): ExamDef | undefined => exams[track as TrackId];

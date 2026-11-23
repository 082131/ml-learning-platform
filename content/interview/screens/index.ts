import type { ScreenDef } from '@/lib/interview/types';
import { aiScreen } from './ai';
import { automationScreen } from './automation';
import { dataScreen } from './data';
import { dataopsScreen } from './dataops';
import { deployScreen } from './deploy';
import { gitScreen } from './git';
import { inferenceScreen } from './inference';
import { mlScreen } from './ml';
import { pythonScreen } from './python';

/** One timed coding screen per role, in curriculum order. */
export const screens: ScreenDef[] = [
  pythonScreen,
  mlScreen,
  dataScreen,
  aiScreen,
  inferenceScreen,
  dataopsScreen,
  deployScreen,
  gitScreen,
  automationScreen,
];

export const getScreen = (id: string): ScreenDef | undefined => screens.find((s) => s.id === id);

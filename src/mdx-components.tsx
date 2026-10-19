import type { MDXComponents } from 'mdx/types';
import { CommonMistake } from '@/components/assessment/CommonMistake';
import { KnowledgeCheck } from '@/components/assessment/KnowledgeCheck';
import { MiniExercise } from '@/components/assessment/MiniExercise';
import { ProjectBrief } from '@/components/assessment/ProjectBrief';
import { AnnotatedCode } from '@/components/code/AnnotatedCode';
import { ProgressiveCode } from '@/components/code/ProgressiveCode';
import { PythonRunner } from '@/components/code/PythonRunner';
import { StepThrough } from '@/components/code/StepThrough';
import { Callout } from '@/components/learning/Callout';
import { Section } from '@/components/learning/Section';
import { Term } from '@/components/learning/Term';

/**
 * The ONLY components lessons may use (constitution IV). Threads add entries here, additively.
 * Thread 3 adds the experiment and visualization components.
 */
export const mdxComponents: MDXComponents = {
  Section,
  Callout,
  Term,
  // Code learning (thread 2)
  Code: AnnotatedCode,
  StepThrough,
  ProgressiveCode,
  PythonRunner,
  // Assessment (thread 2)
  KnowledgeCheck,
  MiniExercise,
  CommonMistake,
  Project: ProjectBrief,
};

import type { ComponentType } from 'react';
import type { MDXComponents } from 'mdx/types';
import { CommonMistake } from '@/components/assessment/CommonMistake';
import { KnowledgeCheck } from '@/components/assessment/KnowledgeCheck';
import { MiniExercise } from '@/components/assessment/MiniExercise';
import { ProjectBrief } from '@/components/assessment/ProjectBrief';
import { AnnotatedCode } from '@/components/code/AnnotatedCode';
import { ProgressiveCode } from '@/components/code/ProgressiveCode';
import { PythonRunner } from '@/components/code/PythonRunner';
import { StepThrough } from '@/components/code/StepThrough';
import { Experiment } from '@/components/experiment/Experiment';
import { Readout } from '@/components/experiment/Readout';
import { Callout } from '@/components/learning/Callout';
import { Section } from '@/components/learning/Section';
import { Term } from '@/components/learning/Term';

/** The ONLY components lessons may use (constitution IV): these core ones plus the registered visualizations. */
const coreComponents = {
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
  // Experiments (thread 3)
  Experiment,
  Readout,
};

/**
 * Visualizations register themselves: every `src/components/viz/<Name>/mdx.ts` default-exports
 * `{ Name: Component }`. A new visualization needs no edit to this file, so parallel threads
 * never conflict here. Names must be unique (checked below and in mdx-components.test.ts).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = ComponentType<any>;
const vizModules = import.meta.glob<Record<string, AnyComponent>>('./components/viz/*/mdx.ts', {
  eager: true,
  import: 'default',
});

export function mergeRegistry(
  base: Record<string, unknown>,
  modules: Record<string, Record<string, AnyComponent>>,
): Record<string, AnyComponent> {
  const merged: Record<string, AnyComponent> = {};
  for (const [path, entries] of Object.entries(modules))
    for (const [name, component] of Object.entries(entries)) {
      if (name in base || name in merged)
        throw new Error(`${path}: component name "${name}" is already registered`);
      merged[name] = component;
    }
  return merged;
}

export const vizComponents = mergeRegistry(coreComponents, vizModules);
export const mdxComponents: MDXComponents = { ...coreComponents, ...vizComponents };

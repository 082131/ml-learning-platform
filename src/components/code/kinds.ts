import type { AnnotationKind } from '@/lib/types';

/** Spelled out next to every annotation, so kinds never rely on underline style or color alone. */
export const KIND_LABEL: Record<AnnotationKind, string> = {
  syntax: 'Syntax',
  variable: 'Variable',
  function: 'Function',
  parameter: 'Parameter',
  math: 'Math operation',
  framework: 'Framework API',
};

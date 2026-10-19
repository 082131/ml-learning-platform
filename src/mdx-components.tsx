import type { MDXComponents } from 'mdx/types';
import { Callout } from '@/components/learning/Callout';
import { Section } from '@/components/learning/Section';
import { Term } from '@/components/learning/Term';

/**
 * The ONLY components lessons may use (constitution IV). Threads add entries here, additively.
 * Thread 2 adds the code-learning components, thread 3 the experiment and visualization components.
 */
export const mdxComponents: MDXComponents = {
  Section,
  Callout,
  Term,
};

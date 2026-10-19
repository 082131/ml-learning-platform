import type { GlossaryTerm } from '@/lib/types';
import networks from './glossary-networks';
import text from './glossary-text';
import training from './glossary-training';

// Glossary terms for the ml/deep chapter (merged into the glossary by content/index.ts).
// Split by lesson group: networks (neurons, forward, backprop), training (optimizers, training loop,
// PyTorch, project) and text (tokenization, embeddings, attention, transformers).
// `introducedIn` is the lesson that first teaches the term.
export default [...networks, ...training, ...text] satisfies GlossaryTerm[];

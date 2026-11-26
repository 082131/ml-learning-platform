import type { LessonMeta } from '@/lib/types';

export default {
  id: 'finetune/data/dataset-quality',
  title: "Dataset quality: deduplication, contamination and synthetic data",
  level: 'intermediate',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    "Explain why duplicates and near-duplicates hurt training, and find them with shingles and Jaccard similarity",
    "Explain how MinHash estimates Jaccard similarity cheaply enough for billions of documents",
    "Check a test set for contamination with n-gram overlap, and say why a contaminated score is worthless",
    "Use synthetic data and data mixing with the right checks",
  ],
  prerequisites: ["finetune/data/chat-templates-masking"],
  concepts: ["near-duplicate", "jaccard-similarity", "minhash", "data-contamination", "synthetic-data", "data-mixture"],
  references: [
    { title: "Lee et al., Deduplicating Training Data Makes Language Models Better", url: "https://arxiv.org/abs/2107.06499" },
    { title: "Broder, On the resemblance and containment of documents (MinHash)", url: "https://ieeexplore.ieee.org/document/666900" },
    { title: "Zhou et al., LIMA: Less Is More for Alignment", url: "https://arxiv.org/abs/2305.11206" },
    { title: "Brown et al., Language Models are Few-Shot Learners (contamination analysis)", url: "https://arxiv.org/abs/2005.14165" },
  ],
} satisfies LessonMeta;

import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/foundations/project-foundations',
  title: 'Project: analyze a small dataset end to end',
  level: 'beginner',
  minutes: 180,
  kind: 'project',
  objectives: [
    'Load, clean and summarize a small dataset in Python',
    'Answer three questions about the data with numbers and plots',
    'Write up findings with the code that produced them',
  ],
  prerequisites: ['ml/foundations/matplotlib-plotting'],
  concepts: ['dataset', 'dataframe', 'histogram'],
  references: [
    {
      title: 'palmerpenguins: Palmer Archipelago (Antarctica) penguin data (CC0)',
      url: 'https://allisonhorst.github.io/palmerpenguins/',
    },
    {
      title:
        'Gorman, Williams and Fraser (2014): Ecological sexual dimorphism and environmental variability within a community of Antarctic penguins',
      url: 'https://doi.org/10.1371/journal.pone.0090081',
    },
  ],
} satisfies LessonMeta;

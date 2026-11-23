import type { ExperimentDef } from '../types';

/** The four kinds of documentation in the Diataxis framework, and the reader need each one serves. */
export const KINDS = {
  tutorial: 'Tutorial: learning by doing',
  howto: 'How-to guide: a task to finish',
  reference: 'Reference: facts to look up',
  explanation: 'Explanation: understanding why',
} as const;
export type Kind = keyof typeof KINDS;

export interface DocSnippet {
  id: string;
  text: string;
  kind: Kind;
  why: string;
}

export const SNIPPETS: DocSnippet[] = [
  { id: 'first-model', text: '"Train your first churn model": install the package, load the sample data, train, and look at the confusion matrix together, step by step.', kind: 'tutorial', why: 'A guided lesson for a newcomer, with a result guaranteed at the end. The reader is learning, not working.' },
  { id: 'gpu', text: '"How to train on a GPU": set device="cuda" in params.yaml, check torch.cuda.is_available(), and lower batch_size if you run out of memory.', kind: 'howto', why: 'Steps toward a goal the reader already has. It assumes they know the basics.' },
  { id: 'api', text: '"train(config, data, *, seed=0) -> Model": parameters, return value, and the exceptions it raises.', kind: 'reference', why: 'Dry, complete facts about the machinery, organised like the code. Generated from docstrings.' },
  { id: 'why-stratify', text: '"Why we stratify the split": churners are 8% of customers, so random splits produce folds with very different churn rates, and recall swings between runs.', kind: 'explanation', why: 'Background and reasons. Nothing to do; it deepens understanding.' },
  { id: 'cli', text: '"Command-line options": a table of every flag of churn-train, its type, default and meaning.', kind: 'reference', why: 'Something to consult while working, not read start to finish.' },
  { id: 'rotate', text: '"How to rotate the model registry token": create a new token, update the CI secret, revoke the old one.', kind: 'howto', why: 'A recipe for one real-world task.' },
  { id: 'design', text: '"How the feature store fits in": a diagram of offline and online stores and why training and serving read the same definitions.', kind: 'explanation', why: 'It answers why and how things relate, despite the "how" in its title: it is not a list of steps.' },
  { id: 'quickstart', text: '"Quickstart" that installs, trains a model, also lists every config option, and explains the history of the project.', kind: 'tutorial', why: 'It starts as a tutorial but mixes in reference and explanation. Diataxis would move those parts to their own pages.' },
];

export interface SorterState {
  answers: Record<string, Kind>;
}

export function diataxisExperiment(id: string): ExperimentDef<SorterState, { answered: number; correct: number }> {
  return {
    id,
    initial: { answers: {} },
    controls: [],
    compute: (s) => {
      const ids = Object.keys(s.answers);
      return { answered: ids.length, correct: ids.filter((i) => SNIPPETS.find((x) => x.id === i)?.kind === s.answers[i]).length };
    },
    readout: (_s, r) => [{ label: 'Sorted', value: `${r.answered} of ${SNIPPETS.length}, ${r.correct} matching the Diataxis kind` }],
  };
}

/** README sections and the reader question each one answers. */
export const README_SECTIONS = [
  { id: 'title', heading: '# churn-model', body: 'Predicts which customers will cancel in the next 30 days, from usage and billing data.', question: 'What is this, in one sentence?' },
  { id: 'why', heading: '## Why', body: 'Retention calls cost money; the model ranks customers so the team calls the 5% most at risk.', question: 'Why does it exist, and is it for me?' },
  { id: 'install', heading: '## Installation', body: '```bash\npip install -e ".[dev]"\n```\nNeeds Python 3.11+.', question: 'How do I get it running?' },
  { id: 'usage', heading: '## Usage', body: '```bash\nchurn-train --config params.yaml\nchurn-predict --model models/churn.pkl --input customers.csv\n```', question: 'How do I use it for the common case?' },
  { id: 'model', heading: '## Model', body: 'Gradient-boosted trees, ROC AUC 0.87 on the March 2026 holdout. See MODEL_CARD.md for data, metrics by segment and limits.', question: 'How good is it, and where does it fail?' },
  { id: 'contributing', heading: '## Contributing', body: 'Open an issue first for large changes. Run `pre-commit install` and `pytest` before pushing. See CONTRIBUTING.md.', question: 'How do I help or report a problem?' },
  { id: 'license', heading: '## License', body: 'Apache-2.0', question: 'Am I allowed to use it?' },
] as const;

export interface ReadmeState {
  sections: string[];
}

export function readmeExperiment(id: string): ExperimentDef<ReadmeState, { markdown: string; unanswered: string[] }> {
  return {
    id,
    initial: { sections: ['title', 'usage'] },
    controls: [],
    compute: (s) => {
      const chosen = README_SECTIONS.filter((x) => s.sections.includes(x.id));
      return {
        markdown: chosen.map((x) => `${x.heading}\n\n${x.body}`).join('\n\n'),
        unanswered: README_SECTIONS.filter((x) => !s.sections.includes(x.id)).map((x) => x.question),
      };
    },
    readout: (s, r) => [
      { label: 'Sections', value: `${s.sections.length} of ${README_SECTIONS.length}` },
      { label: 'Questions a reader still has', value: r.unanswered.length ? r.unanswered.join(' ') : 'none', status: r.unanswered.length ? 'error' : 'ok' },
    ],
  };
}

import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'nesting',
    type: 'choice',
    prompt: 'Which statement about AI, machine learning and deep learning is correct?',
    options: [
      {
        text: 'Deep learning is a kind of machine learning, and machine learning is one way to build AI',
        correct: true,
        explain:
          'The fields nest: AI is the goal, ML learns behavior from data, and DL does that with many-layer neural networks.',
      },
      {
        text: 'Machine learning is a kind of deep learning',
        correct: false,
        explain:
          'It is the other way round. A decision tree or a linear regression is machine learning with no deep network at all.',
      },
      {
        text: 'Generative AI and NLP mean the same thing',
        correct: false,
        explain:
          'They overlap. A spam filter is NLP but not generative; an image generator is generative but not NLP.',
      },
    ],
  },
  {
    id: 'tabular',
    type: 'choice',
    prompt:
      'You have 200,000 rows of customer account data labeled with whether each customer cancelled. What is the usual first approach?',
    options: [
      {
        text: 'Train a classical model such as gradient boosting on your own rows',
        correct: true,
        explain:
          'Tabular prediction with many labels is where training your own model works best: it is cheap, fast and measurable.',
      },
      {
        text: 'Send each row to a language model API and ask whether the customer will cancel',
        correct: false,
        explain:
          'Language models are not built to learn patterns from columns of numbers, and you would pay per row forever.',
      },
      {
        text: 'Fine-tune a large language model on the rows',
        correct: false,
        explain:
          'Fine-tuning adapts a pretrained model to language tasks. A tabular model trained from scratch is simpler and usually better here.',
      },
    ],
  },
  {
    id: 'privacy',
    type: 'choice',
    prompt:
      'A hospital wants to summarize clinical notes, and the notes may not leave its own servers. Which approach fits first?',
    options: [
      {
        text: 'Run a pretrained language model on the hospital’s own servers',
        correct: true,
        explain:
          'A pretrained model needs no training data to start, and running it in house keeps the notes where they must stay.',
      },
      {
        text: 'Call a hosted model API',
        correct: false,
        explain: 'Every request would send the notes to the provider, which the requirement rules out.',
      },
      {
        text: 'Train a language model from scratch on the hospital’s notes',
        correct: false,
        explain:
          'Pretraining needs far more text and compute than one hospital has, and a pretrained model already handles language.',
      },
    ],
  },
  {
    id: 'break-even',
    type: 'numeric',
    prompt:
      'An API request costs $0.003 and a GPU server costs $1,800 a month. At how many requests per day do they cost the same? (Use 30 days.)',
    answer: 20000,
    tolerance: 0,
    hint: 'Monthly API cost is requests per day · 30 · 0.003. Set it equal to 1,800.',
    explain: '1800 / (30 · 0.003) = 1800 / 0.09 = 20,000 requests per day.',
  },
  {
    id: 'fine-tune-when',
    type: 'choice',
    prompt: 'When is fine-tuning most worth its cost?',
    options: [
      {
        text: 'You have thousands of labeled examples of a consistent format or domain, and prompting alone falls short on your evaluation set',
        correct: true,
        explain:
          'Fine-tuning pays off when you can show, on measured examples, that a prompt is not enough and you have the data to teach the model.',
      },
      {
        text: 'You want the model to know facts that change every week',
        correct: false,
        explain:
          'Facts that change belong in retrieval (RAG), not in weights you would have to retrain every week.',
      },
      {
        text: 'You have 20 examples and want better answers',
        correct: false,
        explain: 'Twenty examples are better used in the prompt and as an evaluation set.',
      },
    ],
  },
];

export const chooseExercise: Exercise = {
  id: 'choose-approach',
  prompt:
    'Write `choose(task, labels, data_may_leave)` returning "api", "pretrained", "fine-tune" or "train", following the rules of this lesson.',
  starter: `def choose(task, labels, data_may_leave):
    # task is "language" or "tabular"; labels is how many labeled examples you have
    pass`,
  hints: [
    'Tabular tasks: train your own model.',
    'Language tasks with data that may leave: start with the API.',
    'Language tasks with data that must stay: fine-tune if you have at least 1000 labels, else run a pretrained model.',
  ],
  solution: `def choose(task, labels, data_may_leave):
    if task == "tabular":
        return "train"
    if data_may_leave:
        return "api"
    return "fine-tune" if labels >= 1000 else "pretrained"`,
  explanation:
    'The order mirrors the lesson: the simplest option that fits wins. Real decisions also weigh volume, latency and quality measured on your own examples, but this is the skeleton of the reasoning.',
  tests: `assert choose("tabular", 50000, True) == "train", 'tabular data: train your own model'
assert choose("language", 0, True) == "api", 'language with no data restrictions: start with an API'
assert choose("language", 100, False) == "pretrained", 'data must stay, few labels: run a pretrained model'
assert choose("language", 5000, False) == "fine-tune", 'data must stay, many labels: fine-tuning is an option'`,
};

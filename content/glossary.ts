import type { GlossaryTerm } from '@/lib/types';

// One entry per term. `introducedIn` is the lesson that first teaches it. Keep IDs stable: lessons link to them.
export const glossary: GlossaryTerm[] = [
  {
    id: 'artificial-intelligence',
    term: 'Artificial intelligence (AI)',
    short:
      'The broad field of building computer systems that perform tasks we associate with human intelligence.',
    long: 'AI includes hand-written rule systems, search and planning, and machine learning. Machine learning is the part of AI that learns behavior from data instead of having it written by hand.',
    introducedIn: 'ml/foundations/what-is-ml',
    aliases: ['AI'],
  },
  {
    id: 'machine-learning',
    term: 'Machine learning (ML)',
    short:
      'Building programs whose behavior is learned from example data rather than written as explicit rules.',
    long: 'A machine learning system adjusts the parameters of a model so that its outputs match patterns in training data, then uses that model on new inputs.',
    introducedIn: 'ml/foundations/what-is-ml',
    aliases: ['ML'],
  },
  {
    id: 'deep-learning',
    term: 'Deep learning',
    short: 'Machine learning with neural networks that have many layers.',
    long: 'Each layer transforms its input a little, and stacking many layers lets the network learn complex patterns from raw data such as pixels, audio or text.',
    introducedIn: 'ml/foundations/what-is-ml',
    aliases: ['DL', 'neural networks'],
  },
  {
    id: 'model',
    term: 'Model',
    short:
      'A function with adjustable parameters that maps an input to an output, such as an email to "spam" or "not spam".',
    introducedIn: 'ml/foundations/what-is-ml',
  },
  {
    id: 'training',
    term: 'Training',
    short:
      'Adjusting a model’s parameters so that its outputs on example data get closer to the desired outputs.',
    introducedIn: 'ml/foundations/what-is-ml',
    aliases: ['fitting', 'learning'],
  },
  {
    id: 'inference',
    term: 'Inference',
    short: 'Using a trained model to produce outputs for new inputs, without changing its parameters.',
    long: 'In statistics "inference" means something different (drawing conclusions about a population). In ML engineering it means running the model, also called prediction.',
    introducedIn: 'ml/foundations/what-is-ml',
    aliases: ['prediction'],
  },
  {
    id: 'feature',
    term: 'Feature',
    short: 'One measurable input property of an example, such as the number of links in an email.',
    introducedIn: 'ml/foundations/what-is-ml',
    aliases: ['input variable', 'attribute'],
  },
  {
    id: 'dataset',
    term: 'Dataset',
    short:
      'A collection of examples, usually a table where each row is an example and each column is a feature or label.',
    introducedIn: 'ml/foundations/what-is-ml',
  },
  {
    id: 'label',
    term: 'Label',
    short:
      'The correct answer attached to a training example, such as "spam", which a supervised model learns to predict.',
    introducedIn: 'ml/foundations/types-of-ml',
    aliases: ['target'],
  },
  {
    id: 'supervised-learning',
    term: 'Supervised learning',
    short: 'Learning from examples that come with labels, to predict the label of new examples.',
    introducedIn: 'ml/foundations/types-of-ml',
  },
  {
    id: 'unsupervised-learning',
    term: 'Unsupervised learning',
    short:
      'Learning structure, such as groups or directions of variation, from examples that have no labels.',
    introducedIn: 'ml/foundations/types-of-ml',
  },
  {
    id: 'parameter',
    term: 'Parameter',
    short: 'A number inside a model that training adjusts, such as a weight or a bias.',
    long: 'Not to be confused with a hyperparameter, such as the learning rate, which you choose before training and which training does not change.',
    introducedIn: 'ml/math/loss-optimization',
    aliases: ['weight'],
  },
];

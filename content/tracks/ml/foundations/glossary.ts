import type { GlossaryTerm } from '@/lib/types';

// Terms first taught in the ML Foundations chapter (thread 4). Merged with content/glossary.ts.
export default [
  {
    id: 'rule-based-system',
    term: 'Rule-based system',
    short:
      'A program whose decisions follow rules a person wrote by hand, such as "spam if it contains free".',
    long: 'Rule-based systems are a classic form of AI. They need no training data, but someone must update the rules whenever the problem changes.',
    introducedIn: 'ml/foundations/what-is-ml',
    aliases: ['hand-written rules', 'expert system'],
  },
  {
    id: 'generalization',
    term: 'Generalization',
    short: 'How well a trained model does on new examples it did not see during training.',
    long: 'A model can fit its training examples perfectly and still do badly on new ones. That is why models are always evaluated on examples kept out of training.',
    introducedIn: 'ml/foundations/what-is-ml',
  },
  {
    id: 'reinforcement-learning',
    term: 'Reinforcement learning (RL)',
    short:
      'Learning by trial and error: an agent takes actions, receives rewards, and learns which actions pay off.',
    long: 'There are no labeled answers. The agent learns from the rewards that follow its actions, which may arrive much later than the action that earned them.',
    introducedIn: 'ml/foundations/types-of-ml',
    aliases: ['RL'],
  },
] satisfies GlossaryTerm[];

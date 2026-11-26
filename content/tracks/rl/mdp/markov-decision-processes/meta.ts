import type { LessonMeta } from '@/lib/types';

export default {
  id: 'rl/mdp/markov-decision-processes',
  title: "Markov decision processes: when actions do not always do what you meant",
  level: 'intermediate',
  minutes: 40,
  kind: 'lesson',
  objectives: [
    "Name the parts of a Markov decision process: states, actions, transition probabilities, rewards and \u03b3",
    "Explain the Markov property and why it lets us plan from the current state alone",
    "Read and compute transition probabilities for a slippery grid world",
    "Tell a deterministic policy from a stochastic one",
  ],
  prerequisites: ['rl/foundations/bandits-exploration'],
  concepts: ['mdp', 'transition-probability', 'markov-property', 'stochastic-policy'],
  references: [
    { title: "Reinforcement Learning: An Introduction, 2nd edition (Sutton and Barto), section 3.1 to 3.5", url: 'http://incompleteideas.net/book/the-book-2nd.html' },
    { title: "Artificial Intelligence: A Modern Approach, 4th edition (Russell and Norvig), section 17.1", url: 'https://aima.cs.berkeley.edu/' },
  ],
} satisfies LessonMeta;

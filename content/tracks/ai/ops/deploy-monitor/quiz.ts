import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'release-order',
    type: 'order',
    prompt: 'Put the steps of releasing a new prompt version in order.',
    items: [
      'Run the evaluation set on the new version and compare it per case with the current one',
      'Ship it behind a flag with 0% of traffic',
      'Send a small share of traffic to it and compare quality, latency and cost by version',
      'Increase the share step by step while the numbers hold',
      'Remove the old version once the new one serves everyone',
    ],
    explain:
      'The offline eval catches known failure types cheaply; the canary catches what the eval set doesn’t cover, on a small share of users.',
  },
  {
    id: 'early-look',
    type: 'choice',
    prompt:
      'After one hour, the canary has 61 answers and a 9.8% bad rate; the current version has 5.6% on 939 answers. What should you do?',
    options: [
      {
        text: 'Wait for more answers: 61 is too few to tell a real difference from chance',
        correct: true,
        explain: 'In the lesson’s run the z statistic is 1.35 at that point, well under the 2.33 threshold.',
      },
      {
        text: 'Roll back at once: the bad rate is almost double',
        correct: false,
        explain:
          'Six bad answers out of 61 is well within chance for a version that is just as good. Decisions on tiny samples flip often.',
      },
      {
        text: 'Ship to everyone: an hour without errors is enough',
        correct: false,
        explain: 'Nothing has been shown either way yet; widening the release now risks every user.',
      },
    ],
  },
  {
    id: 'what-to-monitor',
    type: 'choice',
    prompt: 'The error rate and latency of the new prompt look normal. What could still be wrong?',
    options: [
      {
        text: 'The answers: an AI feature can return HTTP 200 quickly with a wrong or unsupported answer',
        correct: true,
        explain: 'Monitor quality signals too: online code checks, user feedback, and graded samples.',
      },
      {
        text: 'Nothing: normal errors and latency mean it works',
        correct: false,
        explain: 'That is true for ordinary APIs, not for model output, which fails while looking fine.',
      },
      {
        text: 'Only the cost',
        correct: false,
        explain: 'Cost is worth watching, but quality is the failure ordinary monitoring misses.',
      },
    ],
  },
  {
    id: 'pin-model',
    type: 'choice',
    prompt: 'Why pin an exact model id in production instead of an alias that moves to the newest model?',
    options: [
      {
        text: 'So a model change is a release you test and roll out, not a surprise',
        correct: true,
        explain:
          'A new model can change wording, length and failure modes. Treat it like a new prompt version: eval, canary, rollback.',
      },
      {
        text: 'Pinned models are cheaper',
        correct: false,
        explain: 'Price depends on the model, not on how you name it.',
      },
      {
        text: 'Aliases are slower',
        correct: false,
        explain: 'An alias resolves to a model; it doesn’t change the speed.',
      },
    ],
  },
  {
    id: 'rollback-speed',
    type: 'choice',
    prompt: 'A regression reaches 5% of users. In the lesson’s run, what does automatic rollback change?',
    options: [
      {
        text: 'Users see far fewer bad answers: 8 extra instead of 35 in 24 hours',
        correct: true,
        explain:
          'The alert fires in hour 5 either way. Rollback decides whether the bad version keeps serving after that.',
      },
      {
        text: 'The alert fires earlier',
        correct: false,
        explain: 'The alert depends on the data seen so far, which is the same up to that hour.',
      },
      {
        text: 'Nothing: someone will roll back by hand anyway',
        correct: false,
        explain: 'By hand at 3 a.m. can mean hours; every hour serves more bad answers.',
      },
    ],
  },
];

export const bucketExercise: Exercise = {
  id: 'pick-version',
  prompt:
    'Write `pick_version(user_id, share)` that returns "candidate" for about `share` of users and "current" for the rest. The same user must always get the same answer.',
  starter: `import hashlib

def pick_version(user_id, share):
    pass`,
  hints: [
    'Hash the user id with hashlib.sha256(user_id.encode()).hexdigest().',
    'Turn the hex digest into an integer with int(digest, 16), then take % 10_000.',
    'Return "candidate" when that bucket is below share * 10_000.',
  ],
  solution: `import hashlib

def pick_version(user_id, share):
    bucket = int(hashlib.sha256(user_id.encode()).hexdigest(), 16) % 10_000
    return "candidate" if bucket < share * 10_000 else "current"`,
  explanation:
    'Hashing gives every user a fixed bucket, so raising the share from 5% to 25% keeps the first 5% on the candidate and adds more users, instead of reshuffling everyone. random.random() would switch users between versions on every request.',
  tests: `assert pick_version("user-1", 0.3) == pick_version("user-1", 0.3), 'the same user gets the same version'
assert pick_version("user-1", 0.0) == "current", 'share 0 means nobody gets the candidate'
assert pick_version("user-1", 1.0) == "candidate", 'share 1 means everybody does'
users = [f"user-{i}" for i in range(2000)]
share = sum(pick_version(u, 0.1) == "candidate" for u in users) / len(users)
assert 0.07 < share < 0.13, f'about 10% of users get the candidate (got {share:.1%})'
assert all(pick_version(u, 0.25) == "candidate" for u in users if pick_version(u, 0.1) == "candidate"), 'raising the share keeps earlier candidate users'`,
};

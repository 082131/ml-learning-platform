import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'implicit-vs-explicit',
    type: 'choice',
    prompt: 'A training job gets AccessDenied writing to s3://acme-ml/models/. You find no Deny statement anywhere. What does that tell you, and what is the fix?',
    options: [
      { text: 'An explicit deny is hidden in a policy you cannot see; ask security to lift it', correct: false, explain: 'With no matching Deny, nothing refused the request on purpose. The cause is simpler.' },
      { text: 'It is an implicit deny: nothing allows it, so add s3:PutObject on models/*', correct: true, explain: 'Requests are refused by default. The fix is the narrowest Allow that covers the action and the prefix.' },
      { text: 'The job’s temporary credentials expired; restart it so they renew', correct: false, explain: 'Expired credentials produce a different error (ExpiredToken). AccessDenied means the credentials were valid but not permitted.' },
    ],
  },
  {
    id: 'deny-beats-allow',
    type: 'choice',
    prompt: 'An admin role has "Action": "*" on "*". The bucket policy denies s3:DeleteObject on models/* for every principal except the CI role. The admin tries to delete a model. What happens?',
    options: [
      { text: 'Allowed, because an administrator’s Allow is more specific', correct: false, explain: 'IAM has no notion of “more specific wins”. Any matching explicit Deny wins.' },
      { text: 'Allowed, because identity policies are checked before resource policies', correct: false, explain: 'All applicable policies are collected first; order of attachment does not matter.' },
      { text: 'Refused, because a matching explicit Deny overrides every Allow', correct: true, explain: 'The admin is not the excepted CI role, so the Deny matches, and a matching Deny always ends the evaluation with a refusal.' },
    ],
  },
  {
    id: 'scp-grants',
    type: 'choice',
    prompt: 'An organization guardrail (SCP) allows s3:* for an account. A new role in that account has no policies attached. Can it read objects?',
    options: [
      { text: 'Yes: the guardrail allows S3 for everyone in the account', correct: false, explain: 'A guardrail sets the outer limit; it grants nothing. The role also needs an IAM Allow.' },
      { text: 'No: guardrails only limit, so the role still needs its own Allow', correct: true, explain: 'A request must be inside the guardrail AND allowed by an identity or resource policy. With no policy, the implicit deny stands.' },
      { text: 'Only for buckets created after the guardrail was attached', correct: false, explain: 'Creation time plays no part. The missing piece is an Allow for this role.' },
    ],
  },
  {
    id: 'why-roles',
    type: 'choice',
    prompt: 'Why is a role with temporary credentials safer for a nightly training job than an IAM user’s access key with the same permissions?',
    options: [
      { text: 'A leaked copy of the credentials stops working within hours on its own', correct: true, explain: 'Temporary credentials expire. A leaked access key keeps working until someone notices and deletes it, which is often far too late.' },
      { text: 'Roles are encrypted, so their permissions cannot be read by attackers', correct: false, explain: 'Policies are not secret. The difference is how long the credentials live.' },
      { text: 'Roles get a smaller set of actions than users are allowed to have', correct: false, explain: 'A role can have exactly the same permissions as a user. Their lifetime is what differs.' },
    ],
  },
  {
    id: 'order',
    type: 'order',
    prompt: 'Put the steps of a single-account AWS policy evaluation in order.',
    items: [
      'Collect every policy that applies to this principal, action and resource',
      'If any matching statement is an explicit Deny, refuse',
      'If the organization guardrail does not allow the action, refuse',
      'If any identity or resource policy Allows it, permit',
      'Otherwise refuse (implicit deny)',
    ],
    explain: 'Denies first so guardrails always win, then the outer limit, then the allows, and “no” whenever nothing said yes.',
  },
];

export const decideExercise: Exercise = {
  id: 'cloud-iam-evaluator',
  prompt:
    'Write `decide(policies, guardrail, action, resource)`. `policies` is a list of statements (dicts with "Effect", "Action" and "Resource", the last two lists of patterns with `*` wildcards). `guardrail` is None or a list of Allow statements that limit what is possible. Return "explicit deny", "guardrail deny", "allow" or "implicit deny", following the four steps. Actions match case-insensitively, resources case-sensitively. Use `fnmatch.fnmatchcase`.',
  starter: `from fnmatch import fnmatchcase

def decide(policies, guardrail, action, resource):
    return "allow"`,
  hints: [
    'Write matches(st, action, resource) first: any action pattern matches action.lower() against pattern.lower(), and any resource pattern matches.',
    'Check the Denies in policies, then (if guardrail is not None) whether any guardrail statement matches, then the Allows.',
  ],
  solution: `from fnmatch import fnmatchcase

def matches(st, action, resource):
    return (any(fnmatchcase(action.lower(), a.lower()) for a in st["Action"])
            and any(fnmatchcase(resource, r) for r in st["Resource"]))

def decide(policies, guardrail, action, resource):
    hits = [st for st in policies if matches(st, action, resource)]
    if any(st["Effect"] == "Deny" for st in hits):
        return "explicit deny"
    if guardrail is not None and not any(matches(st, action, resource) for st in guardrail):
        return "guardrail deny"
    if any(st["Effect"] == "Allow" for st in hits):
        return "allow"
    return "implicit deny"`,
  explanation:
    'The order is the design: denies and guardrails are checked before allows, so no Allow written later can undo them, and silence means no.',
  tests: `P = [
    {"Effect": "Allow", "Action": ["s3:Get*"], "Resource": ["arn:aws:s3:::b/data/*"]},
    {"Effect": "Allow", "Action": ["iam:*"], "Resource": ["*"]},
    {"Effect": "Deny", "Action": ["s3:DeleteObject"], "Resource": ["arn:aws:s3:::b/*"]},
]
G = [{"Effect": "Allow", "Action": ["s3:*"], "Resource": ["*"]}]
assert decide(P, None, "s3:GetObject", "arn:aws:s3:::b/data/x.csv") == "allow"
assert decide(P, None, "S3:getobject", "arn:aws:s3:::b/data/x.csv") == "allow"
assert decide(P, None, "s3:GetObject", "arn:aws:s3:::b/DATA/x.csv") == "implicit deny"
assert decide(P, None, "s3:PutObject", "arn:aws:s3:::b/data/x.csv") == "implicit deny"
assert decide(P, None, "s3:DeleteObject", "arn:aws:s3:::b/data/x.csv") == "explicit deny"
assert decide(P, G, "s3:DeleteObject", "arn:aws:s3:::b/data/x.csv") == "explicit deny"
assert decide(P, None, "iam:CreateAccessKey", "*") == "allow"
assert decide(P, G, "iam:CreateAccessKey", "*") == "guardrail deny"`,
};

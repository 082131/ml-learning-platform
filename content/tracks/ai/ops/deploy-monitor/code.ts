// Code for the deploy and monitor lesson. The canary simulation lives in src/lib/ai/canary.ts (unit-tested); its
// traffic is random with a fixed seed, and the true bad-answer rates are inputs stated in the lesson. canary.py uses
// the first five hours of that simulation (scenario 8%, 5% traffic, seed 1) and was run with CPython 3.13; the release
// and logging samples are sketches and are not run here.
import { canaryExperiment } from '@/lib/ai/canary';
import type { CodeExample } from '@/lib/types';

/** A fixed view for the Visual section: a regression at 5% traffic, no automatic rollback. */
export const canaryNoRollback = canaryExperiment('canary-static', {
  scenario: 'regression',
  share: 0.05,
  autoRollback: false,
  seed: 1,
});

export const canary = canaryExperiment('canary', {
  scenario: 'regression',
  share: 0.05,
  autoRollback: true,
  seed: 1,
});

export const canaryRunner: CodeExample = {
  id: 'canary-runner',
  language: 'python',
  run: 'pyodide',
  source: `from math import sqrt

# Hourly counts from the first five hours of a 5% canary: (answers, bad) per version
current = [(939, 53), (957, 44), (943, 41), (945, 50), (949, 31)]
canary = [(61, 6), (43, 2), (57, 5), (55, 3), (51, 5)]
MIN_SAMPLES, Z_ALERT = 200, 2.33


def z_score(bad1, n1, bad2, n2):
    p = (bad1 + bad2) / (n1 + n2)
    se = sqrt(p * (1 - p) * (1 / n1 + 1 / n2))
    return (bad2 / n2 - bad1 / n1) / se


n1 = bad1 = n2 = bad2 = 0
for hour, ((cn, cb), (nn, nb)) in enumerate(zip(current, canary), start=1):
    n1, bad1, n2, bad2 = n1 + cn, bad1 + cb, n2 + nn, bad2 + nb
    z = z_score(bad1, n1, bad2, n2)
    alert = n2 >= MIN_SAMPLES and z > Z_ALERT
    print(f"hour {hour}: current {bad1 / n1:.1%}  canary {bad2 / n2:.1%} (n={n2})  z={z:.2f}"
          + ("  -> ALERT: roll back" if alert else ""))`,
  annotations: [
    {
      id: 'counts',
      range: { line: 4 },
      kind: 'variable',
      title: 'current, canary',
      what: 'Answers and bad answers (thumbs down or a failed check) per hour, for each version.',
      why: 'Both versions run at the same time on the same kind of traffic, so a difference is due to the version, not the day.',
    },
    {
      id: 'z',
      range: { line: 12 },
      kind: 'math',
      title: 'z statistic',
      what: 'The difference in bad rates divided by how much it would vary by chance if both versions were equally good.',
      why: 'A z above 2.33 happens by chance about 1% of the time in a single check.',
    },
    {
      id: 'min-samples',
      range: { line: 19 },
      kind: 'syntax',
      title: 'n2 >= MIN_SAMPLES',
      what: 'No verdict before the canary has 200 answers.',
      why: 'In hour 1 the canary looks twice as bad (9.8%) on only 61 answers. Small samples swing a lot.',
    },
  ],
  expectedOutput: `hour 1: current 5.6%  canary 9.8% (n=61)  z=1.35
hour 2: current 5.1%  canary 7.7% (n=104)  z=1.15
hour 3: current 4.9%  canary 8.1% (n=161)  z=1.81
hour 4: current 5.0%  canary 7.4% (n=216)  z=1.58
hour 5: current 4.6%  canary 7.9% (n=267)  z=2.41  -> ALERT: roll back`,
};

export const releaseCode: CodeExample = {
  id: 'release-flag',
  language: 'python',
  source: `import hashlib

# Read from your flag service or config store, so changing it needs no deploy
FLAGS = {"support_prompt": {"current": "v7", "candidate": "v8", "candidate_share": 0.05}}
PROMPTS = {"v7": load_prompt("support/v7.md"), "v8": load_prompt("support/v8.md")}

def pick_version(flag, user_id):
    f = FLAGS[flag]
    bucket = int(hashlib.sha256(f"{flag}:{user_id}".encode()).hexdigest(), 16) % 10_000
    return f["candidate"] if bucket < f["candidate_share"] * 10_000 else f["current"]

def answer(question, user):
    version = pick_version("support_prompt", user.id)
    response = client.messages.create(
        model=MODEL_FOR[version],
        max_tokens=400,
        system=PROMPTS[version],
        messages=[{"role": "user", "content": question}],
    )
    log_request(version=version, response=response, user=user)
    return response.content[0].text, version

def rollback(flag):
    FLAGS[flag]["candidate_share"] = 0.0   # every user is back on the current version`,
  annotations: [
    {
      id: 'flags',
      range: { line: 4 },
      kind: 'variable',
      title: 'A flag per change',
      what: 'The current and candidate versions, and the share of users who get the candidate.',
      why: 'Prompts and model choices are configuration: version them like code, but switch them without a deploy.',
    },
    {
      id: 'bucket',
      range: { line: 9 },
      kind: 'math',
      title: 'Stable bucket',
      what: 'A hash of the flag name and user id, mapped to 0 to 9,999.',
      why: 'The same user always gets the same version, so a conversation never switches prompts halfway.',
    },
    {
      id: 'log-version',
      range: { line: 20 },
      kind: 'function',
      title: 'log_request(version=...)',
      what: 'Every log line records which version answered.',
      why: 'Without it you can’t split quality, latency or cost by version, and the canary comparison is impossible.',
    },
    {
      id: 'rollback',
      range: { line: 24 },
      kind: 'syntax',
      title: 'Rollback is one setting',
      what: 'Setting the share to 0 sends everyone to the current version.',
      why: 'A rollback that needs a build and a deploy takes long enough for many users to see the bad version.',
    },
  ],
};

export const loggingCode: CodeExample = {
  id: 'request-log',
  language: 'python',
  source: `import time

def log_request(version, response, user, started, first_token_at, checks):
    logger.info("model_request", extra={
        "prompt_version": version,
        "model": response.model,
        "input_tokens": response.usage.input_tokens,
        "output_tokens": response.usage.output_tokens,
        "cache_read_tokens": response.usage.cache_read_input_tokens,
        "ttft_ms": round((first_token_at - started) * 1000),
        "total_ms": round((time.monotonic() - started) * 1000),
        "stop_reason": response.stop_reason,
        "citation_check": checks.citations_ok,      # the same code graders as the eval set
        "guardrail_blocked": checks.blocked,
        "user_hash": hash_user(user.id),           # not the email or the question text
    })
    # Thumbs up/down arrives later and is joined on response.id`,
  annotations: [
    {
      id: 'version-field',
      range: { line: 5 },
      kind: 'variable',
      title: 'prompt_version',
      what: 'Which prompt and model answered.',
      why: 'Every dashboard and alert should be split by version.',
    },
    {
      id: 'usage',
      range: { line: 7 },
      kind: 'variable',
      title: 'Tokens',
      what: 'Input, output and cached tokens per request, from the API response.',
      why: 'Cost is computed from these. A prompt change that doubles output tokens doubles that part of the bill.',
    },
    {
      id: 'stop',
      range: { line: 12 },
      kind: 'variable',
      title: 'stop_reason',
      what: 'Why the model stopped, for example end_turn or max_tokens.',
      why: 'A rise in max_tokens stops means answers are being cut off.',
    },
    {
      id: 'checks',
      range: { line: 13 },
      kind: 'variable',
      title: 'Online checks',
      what: 'The cheap code graders from the eval set, run on live answers.',
      why: 'User feedback is sparse; automatic checks give a quality signal for every request.',
    },
    {
      id: 'privacy',
      range: { line: 15 },
      kind: 'variable',
      title: 'user_hash',
      what: 'A hash instead of the user’s identity.',
      why: 'Logs are kept and widely read. Keep personal data out, or restrict and expire them.',
    },
  ],
};

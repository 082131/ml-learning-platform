import type { InterviewQuestion } from '@/lib/interview/types';

// Automation: asked in MLOps, ML platform and data engineering loops, usually as "how would you make this job run
// unattended" follow-ups to a project deep dive, and as pipeline or CI/CD design rounds.
export const automationQuestions: InterviewQuestion[] = [
  {
    id: 'auto-what-to-automate',
    role: 'automation',
    kind: 'technical',
    level: 'core',
    topic: 'Choosing what to automate',
    prompt: 'Your team does a lot of manual work around model releases. How do you decide what to automate first?',
    answer: `I start by measuring, not guessing. For a couple of weeks I log each manual task: how long it takes, how often it happens, and how often it goes wrong. That turns "this is annoying" into numbers.

Then I estimate the payback. Time saved per month is minutes per run times runs per month; I subtract the upkeep, because scripts break when APIs and schemas change, and divide the build cost by what is left. A ten-minute task done three times a week saves about two hours a month, so a six-hour build pays back in about three months. A rare task almost never pays back on time alone.

Time is not the only factor, though. Error-prone steps, like copying a model path into a deploy config, are worth automating even when rare, because one mistake costs more than the build. Steps that need judgment, like deciding whether a metric drop is acceptable, I leave to people and instead automate the evidence they look at.

For rare but risky tasks the first step is a runbook. It is cheap, it cuts mistakes, and it becomes the spec if the task later grows enough to automate.`,
    covers: [
      'Measure frequency, duration and error rate first',
      'Break-even: build cost over net monthly savings, including upkeep',
      'Risk and error cost, not only time',
      'Runbooks as the first step for rare tasks; keep judgment with people',
    ],
    redFlags: ['Automating everything without estimating payback', 'Ignoring maintenance cost', 'Automating judgment calls such as release approval without evidence'],
    followUps: ['How would you know the automation actually paid off?', 'What would make you delete an automation?'],
  },
  {
    id: 'auto-cron-pitfalls',
    role: 'automation',
    kind: 'technical',
    level: 'core',
    topic: 'Scheduling',
    prompt: 'A nightly cron job that refreshes features sometimes silently does not run, and sometimes runs twice at once. What could be going on and how do you fix it?',
    answer: `Not running at all usually has one of a few causes. The machine was down or rebooting at the scheduled minute, and plain cron does not catch up missed runs. The job started but failed immediately because cron runs with a minimal environment: a short PATH, no shell profile, a different working directory. Or the schedule hit a daylight saving gap. I would check the cron log first to see whether it started.

Running twice at once is overlap: cron starts a new process at every match whether or not the previous run finished. If a run is slow one night, the next run starts on top of it.

Fixes: use absolute paths and set the environment in the crontab or a wrapper script. Take a lock with \`flock -n\` so a second copy exits cleanly. Schedule in UTC to avoid daylight saving surprises, or use a systemd timer with \`Persistent=true\` so a missed run happens at boot.

Most important, add a heartbeat monitor: the job pings a service on success, and the service alerts when the ping does not arrive in time. A job that never starts cannot report its own failure, so absence of success is the signal to watch.`,
    covers: [
      'Minimal cron environment and PATH',
      'No catch-up of missed runs; machine downtime',
      'Overlap and locking with flock',
      'Heartbeat or dead man’s switch monitoring',
      'Time zones and daylight saving',
    ],
    redFlags: ['Relying only on failure emails from the job itself', 'Not knowing cron starts overlapping runs', 'Fixing it by adding a sleep'],
    followUps: ['When would you move this job from cron to an orchestrator?', 'How would you make the job safe if it does run twice?'],
  },
  {
    id: 'auto-retries',
    role: 'automation',
    kind: 'technical',
    level: 'core',
    topic: 'Retries',
    prompt: 'Your pipeline calls an external API that occasionally fails. How do you design the retry logic?',
    answer: `First I separate transient from permanent failures. Timeouts, connection resets, 429, 502, 503 and 504 are worth retrying; the same request may succeed later. A 400 or 401 or 404 describes a problem with the request itself, so retrying only adds load and delays the error a person needs to see.

For transient failures I use exponential backoff with jitter and a cap. Exponential growth gives a struggling service room to recover. Jitter matters because when an outage hits many clients at once, fixed or purely exponential waits keep them synchronized, so recovery is met by a thundering herd. I cap each wait and the number of attempts so a job fails within a known time. If the server sends Retry-After, I wait at least that long.

Then idempotency. A GET or PUT can be retried freely, but a POST that creates something might have succeeded even though the response was lost. So I only retry non-idempotent calls when the API supports an idempotency key: I send the same key on every attempt and the server returns the stored result for repeats.

In Python I would use urllib3's Retry or tenacity rather than hand-rolled loops, and log every retry so slow degradation is visible.`,
    covers: [
      'Retry only transient errors; fail fast on 4xx',
      'Exponential backoff with jitter and caps',
      'Honour Retry-After',
      'Idempotency keys for non-idempotent calls',
      'Log retries; bounded total time',
    ],
    redFlags: ['Retrying every error including 400', 'Fixed delays for many clients', 'Retrying POST blindly'],
    followUps: ['How would you add a circuit breaker?', 'How do you test retry logic without a flaky server?'],
  },
  {
    id: 'auto-rerun-safe',
    role: 'automation',
    kind: 'technical',
    level: 'core',
    topic: 'Idempotency',
    prompt: 'A batch job that loads daily predictions into a table crashed halfway. What happens when you rerun it, and how should it be designed?',
    answer: `It depends entirely on how it writes. If it appends rows with plain INSERT, a rerun from the start duplicates everything the first run committed, and nothing errors, so downstream dashboards double-count quietly.

The goal is that running the job twice leaves the same state as running it once. Two common designs get there. Overwrite a partition: the job owns the partition for its date and replaces it in one transaction or with an atomic swap, so a rerun simply writes the same partition again. Or upsert on a natural key, like INSERT ... ON CONFLICT (customer_id, date) DO UPDATE, so repeated rows overwrite rather than copy.

For long jobs I add checkpoints so a rerun resumes rather than redoing hours of work. But a checkpoint saved after a batch is written still leaves a window: crash between the write and the checkpoint and that batch is redone. So checkpoints reduce work and idempotent writes make the redo harmless; I need both.

Files get the same care: write to a temp file in the same folder and os.replace it over the target, so readers never see half a file. And the job takes its date as a parameter instead of calling now(), so rerunning last Tuesday processes last Tuesday.`,
    covers: [
      'Plain appends duplicate on rerun',
      'Partition overwrite or upsert on a natural key',
      'Checkpoints plus idempotent writes',
      'Atomic file writes with os.replace',
      'Parameterize by logical date, not now()',
    ],
    redFlags: ['"Just delete the duplicates afterwards"', 'Assuming a crash leaves nothing behind', 'Using the current time inside the job'],
    followUps: ['How do you dedupe when there is no natural key?', 'How would you test that the job is idempotent?'],
  },
  {
    id: 'auto-ml-ci',
    role: 'automation',
    kind: 'technical',
    level: 'core',
    topic: 'CI for ML',
    prompt: 'What would you put in the CI pipeline for an ML training repository, and what would you keep out?',
    answer: `CI should answer one question quickly: is this change safe to merge? So it has to be fast, deterministic and cheap.

In it: linting and type checks. Unit tests for feature transforms and metrics with small hand-checked inputs. Data validation code run against a small committed sample, checking schema, ranges and nulls. A training smoke test that runs a few steps on that tiny sample, which catches broken imports, shape mismatches and config typos in minutes. If there is a serving image, build it and run a quick prediction against it.

Structure: independent jobs run in parallel and later jobs declare needs, so evaluation waits for training. A report job uses if: always() so results are posted even when something fails. I cache pip downloads, use path filters so docs-only changes skip the heavy jobs, and use concurrency groups so a new push cancels the stale run. Required status checks on main make it binding.

Out of it: full training runs, large data scans and anything nondeterministic. Those belong in the training pipeline or a scheduled workflow. Flaky tests get fixed, usually by seeding randomness, not retried until green, or people stop trusting CI.`,
    covers: [
      'Fast, deterministic checks: lint, unit, data checks on a sample',
      'Training smoke test on tiny data',
      'needs, if: always(), caching, path filters, concurrency',
      'Required checks on main',
      'Keep full training and flaky tests out',
    ],
    redFlags: ['Training the real model on every pull request', 'No data checks at all', 'Retrying flaky tests as the fix'],
    followUps: ['How would you secure secrets in this workflow?', 'How do you keep CI under ten minutes as the repo grows?'],
  },
  {
    id: 'auto-gates',
    role: 'automation',
    kind: 'technical',
    level: 'senior',
    topic: 'Model delivery',
    prompt: 'How would you automate promotion of a retrained model to production without letting a worse model through?',
    answer: `I treat promotion as a series of gates, each automated where possible and each producing evidence.

First, comparison against the current champion on the same frozen evaluation set, because a metric gap only means something when the data is held fixed. The challenger must beat the champion by a margin, since run-to-run noise can make an equal model look slightly better.

Second, slice checks. An overall gain can hide a group that got worse, so I compare per-segment metrics and block if any slice drops beyond a tolerance. Third, operational budgets: p95 latency, memory, model size. A more accurate model that breaks the latency budget is not better for the product.

If those pass, the model is registered and deployed to staging automatically. Production goes through a GitHub environment with required reviewers, which pauses the job before it can read production secrets; the reviewer sees the gate report, not raw logs. The rollout itself is a canary or a shadow phase with automatic rollback on error rate or metric alarms.

Rollback should be one command: serving loads a registry alias such as champion, so moving the alias back to the previous version undoes the release in seconds. Credentials come from OIDC federation, not long-lived keys.`,
    covers: [
      'Champion versus challenger on a fixed evaluation set, with a margin',
      'Slice regression checks',
      'Latency and resource budgets',
      'Staging automatic, production behind environment approval',
      'Canary or shadow and alias-based rollback',
    ],
    redFlags: ['Promoting on a single overall metric', 'Comparing models evaluated on different data', 'No rollback plan'],
    followUps: ['What would you do if the champion’s evaluation set is now stale?', 'When would you allow fully automatic promotion?'],
  },
  {
    id: 'auto-airflow-dates',
    role: 'automation',
    kind: 'technical',
    level: 'senior',
    topic: 'Orchestration',
    prompt: 'Explain catchup, backfills and logical dates in Airflow. What changed in Airflow 3, and how do you write tasks that survive reruns?',
    answer: `Each DAG run has a logical date and, for interval timetables, a data interval: the slice of time the run is responsible for. With CronDataIntervalTimetable a daily run for 23 November covers 23 to 24 November and starts after the interval ends. In Airflow 3 a bare cron string uses CronTriggerTimetable instead, so the logical date is the trigger time and the interval has no length. That is a common migration surprise.

Catchup decides what happens when the scheduler finds missed schedule points, for example after a DAG is unpaused with a start date in the past. With catchup=True it creates a run for every missed point; with False only the latest. Airflow 3 changed the default to False.

A backfill is the deliberate version: airflow backfill create with a DAG id and an inclusive from and to date. By default it skips dates that already have runs; reprocess behaviour can redo failed or all completed runs. I set max_active_runs so a backfill does not swamp the warehouse.

Tasks survive reruns when they read their slice from the template variables, data_interval_start and data_interval_end or the logical date, never now(), and write idempotently: overwrite the partition for that interval or upsert. Then retries, clears and backfills all converge to the same result.`,
    covers: [
      'Logical date and data interval',
      'Airflow 3 cron strings use CronTriggerTimetable',
      'catchup default False in Airflow 3',
      'backfill create with reprocess behaviour and max_active_runs',
      'Interval templating and idempotent writes',
    ],
    redFlags: ['Using datetime.now() in tasks', 'Thinking catchup and backfill are the same thing', 'Not knowing why a run’s date differs from its start time'],
    followUps: ['How would you backfill a year without overloading the database?', 'How does Airflow decide whether a DAG run succeeded?'],
  },
  {
    id: 'auto-webhooks',
    role: 'automation',
    kind: 'technical',
    level: 'core',
    topic: 'Event-driven automation',
    prompt: 'You want to start an evaluation job whenever a release is published on GitHub. How do you build the webhook receiver?',
    answer: `First, authenticity. GitHub signs each delivery with HMAC-SHA256 of the raw request body using a shared secret and sends it in X-Hub-Signature-256. I compute the same HMAC over the exact bytes I received, before any JSON parsing, and compare with hmac.compare_digest, which runs in constant time. Re-serializing the JSON first would change whitespace and break genuine signatures. Unsigned or mismatched requests get 401.

Second, respond fast. GitHub records a delivery as failed if the response takes more than ten seconds, so the handler only verifies, records and enqueues, then returns 2xx. A worker reads the queue and starts the evaluation job.

Third, duplicates. Delivery is at least once in practice: I may redeliver after an outage, or a retry happens after a timeout. Each delivery has an X-GitHub-Delivery id, so I store processed ids and acknowledge repeats without queueing them again, or make the job itself idempotent per release tag.

Finally, missed events. GitHub does not automatically redeliver failed deliveries; you can redeliver manually or through the API for three days. So I alert on failed deliveries and keep a periodic reconciliation job that lists recent releases and starts any evaluation that is missing.`,
    covers: [
      'HMAC-SHA256 over the raw body with constant-time compare',
      'Acknowledge within 10 seconds and process from a queue',
      'Deduplicate by delivery id',
      'No automatic redelivery; reconciliation job',
    ],
    redFlags: ['Trusting the payload without a signature check', 'Doing the heavy work inside the request', 'Assuming each event arrives exactly once'],
    followUps: ['How would you rotate the webhook secret without downtime?', 'When would you poll instead of using webhooks?'],
  },
  {
    id: 'auto-agent-guardrails',
    role: 'automation',
    kind: 'technical',
    level: 'senior',
    topic: 'AI agents',
    prompt: 'Your team wants an LLM agent that triages failed pipeline runs and can rerun jobs, edit configs and message people. How do you make it safe?',
    answer: `I assume the model can be wrong or manipulated, so safety lives in the harness, not the prompt. Logs, tickets and web pages the agent reads can contain prompt injection, such as text telling it to send credentials somewhere. Asking the model to ignore such text is not a control.

I put every tool in a risk tier. Reads, such as fetching logs or run metadata, run freely within a scoped, read-only token. Reversible writes, like rerunning a failed task, are allowed with limits. Destructive actions, such as editing production configs or deleting data, and external actions, such as messaging outside the team, need human approval with a clear summary of what will happen. Credentials follow least privilege per tool.

Hard limits sit in code: an allowlist of domains and recipients, a maximum number of steps and a cost budget so a confused agent cannot loop, and timeouts. Approvals must be rare enough to be read, otherwise people rubber-stamp them and the control disappears.

Everything is logged: prompts, tool calls, arguments and results, so I can audit and replay incidents. I would start in read-only mode, where the agent only proposes actions, measure how often its proposals are right, and widen autonomy tier by tier.`,
    covers: [
      'Prompt injection through tool output; harness-level controls',
      'Risk tiers with approval for destructive and external actions',
      'Least privilege, allowlists, step and cost limits',
      'Approval fatigue',
      'Audit logs and gradual autonomy',
    ],
    redFlags: ['Relying on the system prompt for safety', 'Giving the agent an admin token', 'Approving every single action'],
    followUps: ['How would you evaluate the agent before giving it write access?', 'What would an incident with this agent look like, and how would you detect it?'],
  },
  {
    id: 'auto-design-retraining',
    role: 'automation',
    kind: 'system-design',
    level: 'senior',
    topic: 'Pipeline design',
    prompt: 'Design an automated nightly pipeline that refreshes data, retrains a churn model, and promotes it only when it is better. It must run unattended for months.',
    answer: `I would frame it first: one model, nightly cadence, a few million rows, a team of three who do not want pages for routine noise. Success means fresh predictions every morning and no bad model reaching production.

Orchestration: an Airflow or Prefect DAG with extract, validate, features and labels in parallel, then train, evaluate, a promotion gate, and notify. Each task reads its data interval from the run's logical date and writes idempotently, partition overwrite or upsert, so retries and backfills are safe. Tasks get bounded retries with backoff for transient source errors. max_active_runs is 1 so a slow night does not overlap the next.

Data validation is a hard stop: schema, volume, null rates and drift checks. Bad data fails the run before training rather than producing a model trained on garbage.

Promotion: compare with the champion on a fixed evaluation set, require a margin, check slices and latency budgets, then register and move the staging alias automatically. Production promotion can be automatic once the gate has a track record, or behind an approval at first. Rollback is moving the alias back.

Operations: a heartbeat alert if the DAG did not finish by 06:00, distinct alerts for source failure, data failure and gate rejection, each linked to a runbook entry. The notify task uses trigger rule all_done so the summary is always sent, and a separate check ensures a failed run is still marked failed. Pipeline code goes through CI with a smoke test on sample data.`,
    covers: [
      'Clarify cadence, scale, team and success criteria',
      'DAG with parallel branches, idempotent interval-based tasks, bounded retries',
      'Validation as a hard stop before training',
      'Champion-challenger gate with slices and latency; alias rollback',
      'Heartbeat, distinct alerts and runbooks; CI for the pipeline itself',
    ],
    redFlags: ['No validation before training', 'Promoting automatically on a single metric', 'No alert when the pipeline silently does not run'],
    followUps: ['How would you handle labels that arrive 30 days late?', 'What changes if the model must retrain hourly?'],
  },
];

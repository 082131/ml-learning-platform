// Code for "Continuous delivery of models". The gate uses src/lib/automation/gates.ts (unit-tested); the candidate
// and production metrics are invented for the lesson, not measured. promote.py's literals follow the experiment;
// the MLflow calls use the model registry alias API (MLflow 2.9 and later). The workflow is configuration and is not
// run here.
import { CANDIDATES, CHAMPION, LATENCY_BUDGET, SLICE_TOLERANCE, gateExperiment, type GateState } from '@/lib/automation/experiments';
import type { CodeExample } from '@/lib/types';

export const gate = gateExperiment('auto-gate');

const list = (xs: number[]) => `[${xs.join(', ')}]`;

export const promoteCode: CodeExample = {
  id: 'promote-py',
  language: 'python',
  source: `# promote.py: run by the retraining pipeline after evaluation, on the SAME evaluation set for both models
from mlflow import MlflowClient

champion = {"auc": {{champAuc}}, "p95_ms": {{champP95}}, "slices": {{champSlices}}}
candidate = {"auc": {{candAuc}}, "p95_ms": {{candP95}}, "slices": {{candSlices}}}
MIN_GAIN, LATENCY_BUDGET_MS, SLICE_TOLERANCE = {{gain}}, {{budget}}, {{tol}}
data_checks_passed = {{data}}
CANDIDATE_VERSION = "7"                 # registered by the training step

failures = []
if not data_checks_passed:
    failures.append("data checks failed")
if candidate["auc"] - champion["auc"] < MIN_GAIN:
    failures.append("not enough better than production")
if max(c - n for c, n in zip(champion["slices"], candidate["slices"])) > SLICE_TOLERANCE:
    failures.append("a slice regressed")
if candidate["p95_ms"] > LATENCY_BUDGET_MS:
    failures.append("too slow")

client = MlflowClient()
if failures:
    raise SystemExit("blocked: " + "; ".join(failures))      # non-zero exit: the pipeline stops here
client.set_registered_model_alias("churn", "challenger", version=CANDIDATE_VERSION)   # staging deploys this alias`,
  slots: {
    champAuc: () => String(CHAMPION.auc),
    champP95: () => String(CHAMPION.p95),
    champSlices: () => list(CHAMPION.slices),
    candAuc: (s) => String(CANDIDATES[(s as GateState).candidate].m.auc),
    candP95: (s) => String(CANDIDATES[(s as GateState).candidate].m.p95),
    candSlices: (s) => list(CANDIDATES[(s as GateState).candidate].m.slices),
    gain: (s) => (s as GateState).minGain.toFixed(3),
    budget: () => String(LATENCY_BUDGET),
    tol: () => String(SLICE_TOLERANCE),
    data: (s) => ((s as GateState).dataOk ? 'True' : 'False'),
  },
  annotations: [
    {
      id: 'same-evaluation-set',
      range: { line: 1 },
      kind: 'syntax',
      title: "Same evaluation set",
      what: "Both models are scored on identical rows.",
      why: "Comparing a candidate on this week’s data with a champion number from last month compares the data, not the models.",
    },
    {
      id: 'thresholds-in-code-review',
      range: { line: 6 },
      kind: 'parameter',
      title: "Thresholds in code review",
      what: "The gate’s rules are constants in the repository.",
      why: "Changing what counts as \"good enough\" becomes a reviewed pull request, not a setting someone flips.",
    },
    {
      id: 'worst-slice',
      range: { line: 15 },
      kind: 'math',
      title: "Worst slice",
      what: "The largest drop on any slice: champion minus candidate.",
      why: "An average can rise while one customer segment gets much worse.",
    },
    {
      id: 'block-with-an-exit-code',
      range: { line: 22 },
      kind: 'syntax',
      title: "Block with an exit code",
      what: "A failing gate ends the step with a non-zero exit code and a message.",
      why: "The orchestrator or CI sees a failure and nothing downstream (deploy) runs.",
    },
    {
      id: 'promote-by-alias',
      range: { line: 23 },
      kind: 'framework',
      title: "Promote by alias",
      what: "Points the \"challenger\" alias at the new version in the MLflow model registry.",
      why: "Deploy jobs load models:/churn@challenger or @champion, so promotion and rollback are alias moves, not rebuilds.",
    },
  ],
};

export const cdWorkflow: CodeExample = {
  id: 'cd-yaml',
  language: 'yaml',
  source: `# .github/workflows/retrain-and-deliver.yml
name: retrain-and-deliver
on:
  schedule:
    - cron: "0 3 * * 1"            # Mondays 03:00 UTC
  workflow_dispatch:
permissions:
  contents: read
  id-token: write                  # lets the job request an OIDC token for the cloud
concurrency: { group: retrain, cancel-in-progress: false }
jobs:
  retrain:
    runs-on: [self-hosted, gpu]
    timeout-minutes: 240
    steps:
      - uses: actions/checkout@v5
      - run: python pipeline.py --data-version latest-validated --register
      - run: python promote.py     # the gate: exits non-zero if the candidate is not better
  staging:
    needs: retrain
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - run: ./deploy.sh staging models:/churn@challenger && ./smoke_check.sh staging
  production:
    needs: staging
    runs-on: ubuntu-latest
    environment: production         # required reviewers: the job waits for an approval
    steps:
      - run: ./deploy.sh production models:/churn@challenger --canary 10
      - run: ./watch_canary.sh --minutes 30 --max-error-rate 0.01 || ./rollback.sh production`,
  annotations: [
    {
      id: 'scheduled-retraining',
      range: { line: 5 },
      kind: 'syntax',
      title: "Scheduled retraining",
      what: "Retrains every Monday; workflow_dispatch allows a manual run.",
      why: "For drift- or performance-triggered retraining instead, see the DataOps track’s retraining triggers lesson.",
    },
    {
      id: 'oidc-instead-of-keys',
      range: { line: 9 },
      kind: 'parameter',
      title: "OIDC instead of keys",
      what: "The job can request a short-lived OpenID Connect token and exchange it for temporary cloud credentials.",
      why: "No long-lived cloud access keys stored as repository secrets, so nothing durable to leak.",
    },
    {
      id: 'your-own-gpu-runner',
      range: { line: 13 },
      kind: 'parameter',
      title: "Your own GPU runner",
      what: "Labels select a self-hosted runner with a GPU.",
      why: "Use self-hosted runners only for trusted workflows (never for pull requests from forks): a job can leave things behind on the machine.",
    },
    {
      id: 'the-gate',
      range: { line: 18 },
      kind: 'function',
      title: "The gate",
      what: "Compares the candidate with production and exits non-zero to block.",
      why: "Everything after this line only runs for a model that earned it.",
    },
    {
      id: 'staging-first',
      range: { line: 22 },
      kind: 'syntax',
      title: "Staging first",
      what: "Deploy to a production-like environment and run smoke checks there.",
      why: "Catches packaging and serving problems (missing dependency, wrong input schema) before customers see them.",
    },
    {
      id: 'required-reviewers',
      range: { line: 28 },
      kind: 'syntax',
      title: "Required reviewers",
      what: "With protection rules on the production environment, the job pauses until a listed reviewer approves.",
      why: "Continuous delivery: release is automated and ready at all times, and a person decides when.",
    },
    {
      id: 'canary',
      range: { line: 30 },
      kind: 'parameter',
      title: "Canary",
      what: "Sends 10% of traffic to the new model first.",
      why: "Limits the blast radius if the model misbehaves on live traffic (the Deploy track covers rollouts in depth).",
    },
    {
      id: 'automatic-rollback',
      range: { line: 31 },
      kind: 'syntax',
      title: "Automatic rollback",
      what: "If the canary check fails, move traffic back to the champion.",
      why: "Rollback is part of the release, rehearsed and automated, not an emergency improvisation.",
    },
  ],
};

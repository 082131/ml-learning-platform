// Code for the pipelines lesson. generate_metrics.py produced metrics.json with scikit-learn 1.9.1.
// kfp_pipeline.py compiled with kfp 2.18.0 and ran end to end with KFP's local SubprocessRunner; register_mlflow.py
// ran with MLflow 3.18.0 against a local SQLite store. The cache model's printout is checked against CPython 3.13 in
// src/lib/deploy/pipeline.test.ts.
import { annLine } from '@/lib/inference/annotate';
import { PIPELINE_SOURCE, pipelineExperiment, pipelineSlots, type PipelineState } from '@/lib/deploy/pipeline';
import type { CodeExample } from '@/lib/types';
import metricsSource from './generate_metrics.py?raw';
import kfpSource from './kfp_pipeline.py?raw';
import mlflowSource from './register_mlflow.py?raw';

export const experiment = pipelineExperiment('pipe', { data: 'v1', features: 'f2', C: '1', threshold: 0.95 });

const st = (s: unknown) => s as PipelineState;

export const cacheCode: CodeExample = {
  id: 'pipeline-cache',
  language: 'python',
  source: PIPELINE_SOURCE,
  slots: Object.fromEntries(
    ['metrics', 'data', 'features', 'C', 'threshold'].map((k) => [k, (s: unknown) => pipelineSlots(st(s))[k]!]),
  ),
  annotations: [
    annLine(PIPELINE_SOURCE, 'chain', 'k.append(fnv1a(f"validate|{k[0]}"))', {
      kind: 'math',
      title: 'Keys are chained',
      what: 'The validate key hashes the ingest key, so it changes whenever ingest’s output could have changed.',
      why: 'This is why a change near the start re-runs everything after it, while a change to training reuses ingest, validate and features.',
    }),
    annLine(PIPELINE_SOURCE, 'cache', 'cache = set(keys("v1", "f1", "1"))', {
      kind: 'variable',
      title: 'The cache',
      what: 'The keys of the outputs the previous run stored: data v1, features f1, C = 1.',
      why: 'Real orchestrators keep this in a database next to the artifact store, keyed the same way.',
    }),
    annLine(PIPELINE_SOURCE, 'gate', 'if acc < threshold:', {
      kind: 'syntax',
      title: 'The release gate',
      what: 'The new model must pass an absolute threshold and beat the model in production.',
      why: 'Without the second check, a run that passes the threshold but is worse than production would replace it.',
    }),
  ],
};

const M = metricsSource.replace(/\n$/, '');
export const metricsCode: CodeExample = {
  id: 'generate-metrics',
  language: 'python',
  source: M,
  annotations: [
    annLine(M, 'split', 'train_test_split(X, y, test_size=360, stratify=y, random_state=0)', {
      kind: 'parameter',
      title: 'One fixed test set',
      what: 'The same 360 images score every setting.',
      why: 'Comparing a new model with production only means something on the same held-out data.',
    }),
    annLine(M, 'round', 'out[f"{data}/{code}/{C}"] = round(acc, 4)', {
      kind: 'variable',
      title: 'The numbers the experiment uses',
      what: 'Test accuracy for every combination, written to metrics.json.',
      why: 'The experiment above does not train anything in your browser; it looks these real results up.',
    }),
  ],
};

const K = kfpSource.replace(/\n$/, '');
export const kfpCode: CodeExample = {
  id: 'kfp-pipeline',
  language: 'python',
  source: K,
  annotations: [
    annLine(K, 'component', '@dsl.component(base_image=IMAGE, packages_to_install=PKGS)', {
      kind: 'framework',
      title: 'A component is a container',
      what: 'KFP turns the function into a step that runs in its own container from this image, after installing the packages.',
      why: 'Steps share nothing but artifacts and parameters, so each one can be cached, retried or moved to another node.',
    }),
    annLine(K, 'artifact', 'def ingest(version: str, train: Output[Dataset], test: Output[Dataset]):', {
      kind: 'framework',
      title: 'Typed artifacts',
      what: 'Output[Dataset] gives the step a path to write to; KFP uploads the file to the artifact store and records it.',
      why: 'Later steps receive the artifact, not a variable in memory. That record is the lineage.',
    }),
    annLine(K, 'wire', 'model = fit(train=data.outputs["train"], C=C)', {
      kind: 'framework',
      title: 'Wiring steps',
      what: 'Passing one step’s output into another creates the edge of the graph.',
      why: 'The orchestrator works out the order and the parallelism from these edges; you never call the steps yourself.',
    }),
    annLine(K, 'if', 'with dsl.If(score.output >= threshold):', {
      kind: 'syntax',
      title: 'The gate in the pipeline',
      what: 'register only runs when the condition holds. The compiler writes it as a triggerPolicy condition.',
      why: 'The gate is part of the recorded pipeline, so nobody can skip it by hand.',
    }),
  ],
};

export const kfpYaml: CodeExample = {
  id: 'kfp-yaml',
  language: 'yaml',
  source: `# Excerpt of digits_pipeline.yaml, written by compiler.Compiler().compile(digits, "digits_pipeline.yaml")
# PIPELINE DEFINITION
# Name: digits-training
# Inputs:
#    C: float [Default: 1.0]
#    threshold: float [Default: 0.95]
#    version: str [Default: 'v2']
root:
  dag:
    tasks:
      condition-1:
        dependentTasks:
        - evaluate
        - fit
        triggerPolicy:
          condition: inputs.parameter_values['pipelinechannel--evaluate-Output'] >=
            inputs.parameter_values['pipelinechannel--threshold']
      evaluate:
        cachingOptions:
          enableCache: true
        componentRef:
          name: comp-evaluate`,
  annotations: [],
};

export const kfpLog: CodeExample = {
  id: 'kfp-local-log',
  language: 'bash',
  source: `# kfp.local with SubprocessRunner, two runs, log lines trimmed
# run 1: version="v2", C=1.0, threshold=0.95
Executing task 'ingest'    ... finished with status SUCCESS
Executing task 'fit'       ... finished with status SUCCESS
Executing task 'evaluate'  ... finished with status SUCCESS
    Output: 0.9666666666666667
Executing task 'register'  ... finished with status SUCCESS
Pipeline 'digits-training' finished with status SUCCESS

# run 2: version="v1", C=1.0, threshold=0.97
Executing task 'ingest'    ... finished with status SUCCESS
Executing task 'fit'       ... finished with status SUCCESS
Executing task 'evaluate'  ... finished with status SUCCESS
    Output: 0.9638888888888889
Pipeline 'digits-training' finished with status SUCCESS`,
  annotations: [],
};

const R = mlflowSource.replace(/\n$/, '');
export const mlflowCode: CodeExample = {
  id: 'register-mlflow',
  language: 'python',
  source: R,
  annotations: [
    annLine(R, 'params', 'mlflow.log_params({"data_version": version, "rows": n, "C": C})', {
      kind: 'framework',
      title: 'Lineage as run parameters',
      what: 'The run records which data version and settings produced the model.',
      why: 'Months later, “which data trained production?” is one lookup instead of an investigation.',
    }),
    annLine(R, 'alias', 'prod = client.get_model_version_by_alias("digits", "production")', {
      kind: 'framework',
      title: 'Aliases',
      what: 'An alias is a movable name pointing at one model version. The server loads models:/digits@production.',
      why: 'Promoting or rolling back is moving the alias; no file is copied and the serving config does not change.',
    }),
    annLine(R, 'register', 'mv = mlflow.register_model(info.model_uri, "digits")', {
      kind: 'framework',
      title: 'A new version',
      what: 'Registering adds version 1, 2, 3, … under the model name, each linked to the run that logged it.',
      why: 'Old versions stay, so rolling back is pointing the alias at the previous number.',
    }),
  ],
};

export const mlflowOutput: CodeExample = {
  id: 'register-mlflow-output',
  language: 'bash',
  source: `$ python register_mlflow.py
v1 C=1.0: accuracy 0.9639, registered as version 1 with alias production
v1 C=10.0: accuracy 0.9611, not registered (production 0.9639)
v2 C=10.0: accuracy 0.9694, registered as version 2 with alias production
production -> version 2 data v2 run 5d894fb6`,
  annotations: [],
};

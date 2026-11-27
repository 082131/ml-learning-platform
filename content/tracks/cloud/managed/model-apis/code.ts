// Code for "Model APIs". The comparison is src/lib/cloud/apis.ts (unit-tested), with illustrative token and GPU
// prices, not quotes. apis.py runs under CPython 3.13 and Pyodide (checked by python-outputs.test.ts). The Bedrock
// (boto3 1.x, Converse API) and Vertex AI (google-genai 1.x) snippets need cloud accounts and are not run here.
import type { ApiInput } from '@/lib/cloud/apis';
import { apiExperiment } from '@/lib/cloud/experiments';
import type { CodeExample } from '@/lib/types';

export const api = apiExperiment('cloud-api');

const A = (s: unknown) => s as ApiInput;

export const apiDemo: CodeExample = {
  id: 'cloud-api-demo',
  language: 'python',
  run: 'pyodide',
  source: `import math

tokens_in, tokens_out = 1000, 300           # per request
price_in, price_out = 0.50, 1.50            # $ per million tokens (illustrative)
gpu_hour, tps, peak = 1.00, 400, 3          # $ per GPU-hour, output tokens/s per GPU, busiest hour / average
ops = 10 * 100                              # engineer hours per month x $ per hour

def api(per_day):
    return 30 * per_day * (tokens_in * price_in + tokens_out * price_out) / 1e6

def self_host(per_day):
    avg_tps = per_day * tokens_out / 86400
    gpus = max(1, math.ceil(avg_tps * peak / tps))
    return gpus, gpus * 730 * gpu_hour + ops, avg_tps / (gpus * tps)

for per_day in (1_000, 10_000, 100_000, 1_000_000):
    gpus, cost, busy = self_host(per_day)
    a = api(per_day)
    print(f"{per_day:>9,}/day  API \${a:9,.0f}  self-host \${cost:7,.0f} ({gpus:>2} GPUs, {busy:4.0%} busy)  -> {'API' if a <= cost else 'self-host'}")`,
  expectedOutput: `    1,000/day  API $       28  self-host $  1,730 ( 1 GPUs,   1% busy)  -> API
   10,000/day  API $      285  self-host $  1,730 ( 1 GPUs,   9% busy)  -> API
  100,000/day  API $    2,850  self-host $  3,190 ( 3 GPUs,  29% busy)  -> API
1,000,000/day  API $   28,500  self-host $ 20,710 (27 GPUs,  32% busy)  -> self-host`,
  annotations: [
    {
      id: 'per-token',
      range: { line: 9 },
      kind: 'math',
      title: 'The API bill follows traffic',
      what: 'Requests × (input tokens × input price + output tokens × output price), per million tokens. Zero requests, zero cost.',
      why: 'Every cost on this line scales with use, which is why an API is almost always cheapest at low volume.',
    },
    {
      id: 'peak',
      range: { line: 13 },
      kind: 'math',
      title: 'GPUs are sized for the busiest hour',
      what: 'The average output rate × the peak factor, divided by what one GPU sustains, rounded up, and never below one GPU.',
      why: 'You pay for the GPUs every hour, so the quiet hours are paid at the busy hours’ size.',
    },
    {
      id: 'busy',
      range: { line: 14 },
      kind: 'math',
      title: 'Why “busy” stays near a third',
      what: 'Average load ÷ provisioned capacity. With a peak three times the average, it can never exceed about 33%.',
      why: 'Autoscaling raises it by shrinking the fleet at night; an API provider gets the same effect by pooling many customers.',
    },
  ],
};

export const bedrockCode: CodeExample = {
  id: 'cloud-bedrock-converse',
  language: 'python',
  source: `import boto3

bedrock = boto3.client("bedrock-runtime", region_name="us-west-2")      # no API key: the caller's IAM role signs

response = bedrock.converse(
    modelId="meta.llama3-1-8b-instruct-v1:0",
    messages=[{"role": "user", "content": [{"text": "Summarise this ticket: ..."}]}],
    inferenceConfig={"maxTokens": {{maxTokens}}, "temperature": 0.2},
)
print(response["output"]["message"]["content"][0]["text"])
usage = response["usage"]                                   # what you are billed for
print(usage["inputTokens"], usage["outputTokens"])`,
  slots: {
    maxTokens: (s) => String(A(s).outputTokens),
  },
  annotations: [
    {
      id: 'iam',
      range: { line: 3 },
      kind: 'parameter',
      title: 'Authenticated by IAM, in a region you choose',
      what: 'Bedrock requests are signed with the caller’s AWS credentials; access is the bedrock:InvokeModel permission on the model.',
      why: 'The same roles, policies and VPC endpoints as the rest of your account, and the data is processed in the region you call.',
    },
    {
      id: 'model',
      range: { line: 6 },
      kind: 'parameter',
      title: 'An open-weight model, hosted for you',
      what: 'The model ID picks a model from the Bedrock catalog; Converse uses one request shape for all of them.',
      why: 'You could run this same model yourself on a GPU instance. Here you pay per token instead of per hour.',
    },
    {
      id: 'max',
      range: { line: 8 },
      kind: 'parameter',
      title: 'maxTokens caps the expensive side',
      what: 'The longest answer the model may write, linked to the lab’s output tokens per request.',
      why: 'Output tokens usually cost several times input tokens, so this is the first cost limit to set.',
    },
    {
      id: 'usage',
      range: { line: 11 },
      kind: 'variable',
      title: 'Measure what you pay for',
      what: 'Every response reports its input and output tokens.',
      why: 'Log them per feature and per user: they are the inputs of the lab’s formula, measured instead of guessed.',
    },
  ],
};

export const vertexCode: CodeExample = {
  id: 'cloud-vertex-genai',
  language: 'python',
  source: `from google import genai
from google.genai import types

client = genai.Client(vertexai=True, project="acme-ml", location="europe-west4")   # service account credentials

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="Summarise this ticket: ...",
    config=types.GenerateContentConfig(max_output_tokens=300, temperature=0.2),
)
print(response.text)
print(response.usage_metadata.prompt_token_count, response.usage_metadata.candidates_token_count)`,
  annotations: [
    {
      id: 'vertex',
      range: { line: 4 },
      kind: 'parameter',
      title: 'The same call through Vertex AI',
      what: 'vertexai=True sends the request to your Google Cloud project and region, authenticated with its service account (Application Default Credentials).',
      why: 'Billing, quotas, IAM and data location follow the project, as with every other Google Cloud service.',
    },
    {
      id: 'usage',
      range: { line: 12 },
      kind: 'variable',
      title: 'Token counts again',
      what: 'prompt_token_count is the input, candidates_token_count the output.',
      why: 'Different names, same two numbers that set the bill.',
    },
  ],
};

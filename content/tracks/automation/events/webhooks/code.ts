// Code for "Webhooks and event-driven automation". The signature view computes HMAC-SHA256 with
// src/lib/automation/sha256.ts (checked against Node's crypto and GitHub's documented example); the delivery view is
// a simulation (src/lib/automation/webhook.ts). verify_demo.py runs under CPython 3.13 and Pyodide. The FastAPI
// receiver is not run here.
import { deliveryExperiment, signatureExperiment, type SignatureState } from '@/lib/automation/experiments';
import type { CodeExample } from '@/lib/types';

export const signature = signatureExperiment('auto-signature');
export const delivery = deliveryExperiment('auto-delivery');

const py = (s: string) => JSON.stringify(s);

export const verifyDemo: CodeExample = {
  id: 'verify-demo',
  language: 'python',
  run: 'pyodide',
  source: `import hashlib
import hmac

def signature(secret: str, raw_body: bytes) -> str:
    return "sha256=" + hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()

def verify(secret: str, raw_body: bytes, header: str) -> bool:
    return hmac.compare_digest(signature(secret, raw_body), header)

# The test values from GitHub's "Validating webhook deliveries" documentation:
secret = "It's a Secret to Everybody"
body = b"Hello, World!"
header = "sha256=757107ea0eb2509fc211221cce984b8a37570b6d7586c22c46f4379c8b043e17"
print("GitHub example:", verify(secret, body, header))

# A JSON body, as sent, then after a parse and re-serialise, then tampered with.
sent = b'{"action":"opened","ref":"main"}'
h = signature("whsec-demo-1234", sent)
for label, received in [("raw bytes", sent),
                        ("re-serialised", b'{"action": "opened", "ref": "main"}'),
                        ("tampered", b'{"action":"closed","ref":"main"}')]:
    print(f"{label:14} valid={verify('whsec-demo-1234', received, h)}")`,
  expectedOutput: `GitHub example: True
raw bytes      valid=True
re-serialised  valid=False
tampered       valid=False`,
  annotations: [
    {
      id: 'hmac-sha256',
      range: { line: 5 },
      kind: 'function',
      title: "HMAC-SHA256",
      what: "A keyed hash of the raw request body. Only someone with the secret can produce it.",
      why: "It proves both who sent the request and that the body was not changed on the way.",
    },
    {
      id: 'compare-digest',
      range: { line: 8 },
      kind: 'function',
      title: "compare_digest",
      what: "Compares in time that does not depend on where the strings first differ.",
      why: "A plain == can leak, through timing, how many leading characters of a forged signature were right.",
    },
    {
      id: 'a-known-test-vector',
      range: { line: 10 },
      kind: 'syntax',
      title: "A known test vector",
      what: "GitHub publishes this secret, payload and signature so you can test your verifier.",
      why: "Always check your implementation against the provider’s example before trusting it.",
    },
    {
      id: 'same-json-different-bytes',
      range: { line: 20 },
      kind: 'variable',
      title: "Same JSON, different bytes",
      what: "Parsing and re-serialising adds spaces.",
      why: "The signature covers bytes, not meaning. Verify the raw body before any parsing.",
    },
  ],
};

export const signCode: CodeExample = {
  id: 'sign-live',
  language: 'python',
  source: `import hashlib, hmac

secret = {{secret}}
raw_body = {{body}}.encode()
header = "sha256=" + hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
print(header)`,
  slots: {
    secret: (s) => py((s as SignatureState).secret),
    body: (s) => py((s as SignatureState).body),
  },
  annotations: [
    {
      id: 'the-shared-secret',
      range: { line: 3 },
      kind: 'variable',
      title: "The shared secret",
      what: "Set once in the provider’s webhook settings and in your receiver’s environment.",
      why: "Never in the code or the repository; rotate it if it leaks.",
    },
    {
      id: 'the-header-value',
      range: { line: 5 },
      kind: 'math',
      title: "The header value",
      what: "This prints the same string as the sender panel above.",
      why: "Change the secret or the body and both change together.",
    },
  ],
};

export const receiverCode: CodeExample = {
  id: 'webhook-receiver',
  language: 'python',
  source: `# app.py: a GitHub webhook receiver (FastAPI). Verify, deduplicate, enqueue, answer fast.
import os

from fastapi import FastAPI, Header, HTTPException, Request

from jobs import queue, seen_before          # your queue (Redis, SQS, a database table) and dedup store
from verify import verify

SECRET = os.environ["GITHUB_WEBHOOK_SECRET"]
app = FastAPI()

@app.post("/hooks/github", status_code=202)
async def github_hook(
    request: Request,
    x_hub_signature_256: str = Header(),
    x_github_delivery: str = Header(),
    x_github_event: str = Header(),
):
    raw = await request.body()                       # the exact bytes that were signed
    if not verify(SECRET, raw, x_hub_signature_256):
        raise HTTPException(status_code=401)
    if seen_before(x_github_delivery):               # an atomic insert-if-absent, kept for a few days
        return {"status": "duplicate"}
    queue.enqueue("handle_github_event", x_github_event, raw)
    return {"status": "queued"}                      # well inside GitHub's 10-second limit`,
  annotations: [
    {
      id: 'secret-from-the-environment',
      range: { line: 9 },
      kind: 'variable',
      title: "Secret from the environment",
      what: "Read at start-up; the app fails fast if it is missing.",
      why: "Secrets in code end up in Git history.",
    },
    {
      id: 'headers-by-name',
      range: { line: 15 },
      kind: 'parameter',
      title: "Headers by name",
      what: "FastAPI maps x_hub_signature_256 to the X-Hub-Signature-256 header.",
      why: "A missing header is a 422 error before your code runs.",
    },
    {
      id: 'raw-bytes-first',
      range: { line: 19 },
      kind: 'syntax',
      title: "Raw bytes first",
      what: "Read the body as bytes, before any JSON parsing.",
      why: "The HMAC is over the exact bytes; a parsed-and-dumped body will not match.",
    },
    {
      id: 'reject-unsigned-requests',
      range: { line: 21 },
      kind: 'syntax',
      title: "Reject unsigned requests",
      what: "Anyone can POST to a public URL. Without a valid signature, do nothing.",
      why: "Otherwise a stranger can trigger your retraining pipeline or deploys.",
    },
    {
      id: 'deduplicate',
      range: { line: 22 },
      kind: 'function',
      title: "Deduplicate",
      what: "Skip a delivery id that was already processed.",
      why: "Retries and redeliveries happen; side effects such as starting a job must happen once.",
    },
    {
      id: 'enqueue-do-not-work',
      range: { line: 24 },
      kind: 'function',
      title: "Enqueue, do not work",
      what: "Hand the event to a worker and return.",
      why: "Slow work in the request makes the sender time out and record a failure even though the work happened.",
    },
  ],
};

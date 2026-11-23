import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'raw',
    type: 'choice',
    prompt: 'Your receiver parses the JSON, then verifies json.dumps(payload) against X-Hub-Signature-256. Valid deliveries fail. Why?',
    options: [
      { text: 'GitHub signs with SHA-1, not SHA-256', correct: false, explain: 'X-Hub-Signature-256 is HMAC-SHA256. (The older X-Hub-Signature header used SHA-1.)' },
      { text: 'json.dumps produces different bytes than GitHub sent', correct: true, explain: 'Spacing and key order change. The signature covers the raw bytes; verify those, then parse.' },
      { text: 'The secret must be base64-encoded first', correct: false, explain: 'The secret is used as plain UTF-8 bytes.' },
    ],
  },
  {
    id: 'timeout',
    type: 'choice',
    prompt: 'A webhook handler starts a retraining job synchronously; it takes 25 seconds before responding. What does GitHub record?',
    options: [
      { text: 'A successful delivery, since a 200 was eventually returned', correct: false, explain: 'GitHub stops waiting at 10 seconds.' },
      { text: 'A failed delivery, since it took longer than 10 seconds', correct: true, explain: 'GitHub’s docs: a server that takes longer than 10 seconds to respond is recorded as a failure. Queue the work and answer 202 at once.' },
      { text: 'A pending delivery that GitHub retries until it succeeds', correct: false, explain: 'GitHub does not redeliver failed deliveries automatically; you redeliver them yourself.' },
    ],
  },
  {
    id: 'dedup',
    type: 'choice',
    prompt: 'A payment provider retries webhooks until it gets a 2xx. What must the receiver do to start each job exactly once?',
    options: [
      { text: 'Return 500 on duplicates so the provider stops sending them', correct: false, explain: 'A 500 tells the provider to retry again.' },
      { text: 'Store processed event ids and skip ones already seen', correct: true, explain: 'At-least-once delivery plus deduplication by event id gives effectively-once processing.' },
      { text: 'Process events only from the provider’s IP address list', correct: false, explain: 'That is an authentication measure; it does nothing about duplicates.' },
    ],
  },
  {
    id: 'compare',
    type: 'choice',
    prompt: 'Why compare signatures with hmac.compare_digest instead of ==?',
    options: [
      { text: 'compare_digest also checks the signature has not expired', correct: false, explain: 'There is no expiry in an HMAC. (Some providers add a signed timestamp for that.)' },
      { text: 'Its run time does not reveal how many characters matched', correct: true, explain: '== can stop at the first difference; an attacker can measure that to guess a signature byte by byte.' },
      { text: '== fails on hexadecimal strings longer than 32 characters', correct: false, explain: '== compares strings of any length.' },
    ],
  },
  {
    id: 'poll-or-push',
    type: 'choice',
    prompt: 'A model should retrain within minutes of a new labelled batch landing in a bucket, which happens a few times a week at random times. What trigger fits best?',
    options: [
      { text: 'A cron job every minute that lists the bucket', correct: false, explain: 'Works, but makes about 10,000 list calls a week for a handful of events.' },
      { text: 'A nightly schedule', correct: false, explain: 'Misses the "within minutes" requirement.' },
      { text: 'A storage event notification that starts the pipeline', correct: true, explain: 'Events fit rare, unpredictable triggers with a latency requirement. Keep a slow scheduled sweep as a safety net for lost events.' },
    ],
  },
];

export const signatureExercise: Exercise = {
  id: 'verify-and-dedup',
  prompt:
    'Write a class `Receiver(secret)` with a method `handle(raw_body, signature_header, delivery_id)` that returns "401" if the HMAC-SHA256 signature (header format "sha256=<hex>") does not match the raw body, "duplicate" if the delivery id was already accepted, and otherwise records the id, appends the raw body to `self.queue` (a list) and returns "202". Use hmac.compare_digest.',
  starter: `class Receiver:
    def __init__(self, secret):
        self.queue = []

    def handle(self, raw_body, signature_header, delivery_id):
        self.queue.append(raw_body)
        return "202"`,
  hints: [
    'expected = "sha256=" + hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest().',
    'Check the signature before the delivery id: an unsigned request must not be able to mark ids as seen.',
  ],
  solution: `import hashlib
import hmac

class Receiver:
    def __init__(self, secret):
        self.secret = secret.encode()
        self.seen = set()
        self.queue = []

    def handle(self, raw_body, signature_header, delivery_id):
        expected = "sha256=" + hmac.new(self.secret, raw_body, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, signature_header):
            return "401"
        if delivery_id in self.seen:
            return "duplicate"
        self.seen.add(delivery_id)
        self.queue.append(raw_body)
        return "202"`,
  explanation:
    'Authenticate first, then deduplicate, then enqueue. The response goes back at once; a worker does the slow part.',
  tests: `import hashlib, hmac
def sign(secret, body):
    return "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
r = Receiver("It's a Secret to Everybody")
assert r.handle(b"Hello, World!", "sha256=757107ea0eb2509fc211221cce984b8a37570b6d7586c22c46f4379c8b043e17", "d1") == "202"
body = b'{"action":"opened"}'
assert r.handle(body, sign("It's a Secret to Everybody", body), "d2") == "202"
assert r.handle(body, sign("It's a Secret to Everybody", body), "d2") == "duplicate"
assert r.handle(b'{"action": "opened"}', sign("It's a Secret to Everybody", body), "d3") == "401"
assert r.handle(body, sign("wrong", body), "d4") == "401"
assert r.handle(body, sign("wrong", body), "d2") == "401"
assert r.queue == [b"Hello, World!", body]`,
};

// Receiving webhooks safely: verify the signature, answer fast, and deduplicate by delivery id. The delivery
// simulation models a sender that waits `timeout` seconds for a 2xx and, like Stripe, retries failed deliveries.
// (GitHub waits 10 seconds and does not retry automatically; you redeliver by hand or through its API.)
import { hmacHex } from './sha256';

/** GitHub's header format: X-Hub-Signature-256: sha256=<hex HMAC of the raw body>. */
export function signatureHeader(secret: string, body: string): string {
  return `sha256=${hmacHex(secret, body)}`;
}

/** Compares every character, like hmac.compare_digest, so the time taken does not reveal how much matched. */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function verifySignature(secret: string, rawBody: string, header: string): boolean {
  return constantTimeEqual(signatureHeader(secret, rawBody), header);
}

export interface DeliveryInput {
  /** 'sync' does the work before answering; 'queue' stores the event, answers 202, and a worker does the work. */
  mode: 'sync' | 'queue';
  /** Seconds the work takes. */
  workSeconds: number;
  /** Seconds the sender waits for an answer. */
  timeout: number;
  /** Retries the sender makes after a failed delivery. */
  senderRetries: number;
  /** The receiver remembers delivery ids it has processed and ignores repeats. */
  dedup: boolean;
  /** Events sent (each gets its own delivery id). */
  events: number;
}

export interface DeliveryAttempt {
  event: number;
  attempt: number;
  /** What the sender recorded. */
  recorded: 'delivered' | 'timed out';
  /** Did this attempt start the side effect (for example a retraining job)? */
  sideEffect: boolean;
}

export interface DeliveryResult {
  attempts: DeliveryAttempt[];
  /** Side effects per event: 1 is correct, more is a duplicate. */
  effects: number[];
  duplicates: number;
}

export function simulateDeliveries(i: DeliveryInput): DeliveryResult {
  const attempts: DeliveryAttempt[] = [];
  const effects = new Array<number>(i.events).fill(0);
  const seen = new Set<number>();
  for (let e = 0; e < i.events; e++) {
    for (let a = 1; a <= 1 + i.senderRetries; a++) {
      const duplicate = i.dedup && seen.has(e);
      // A known delivery id is answered at once: there is no work to do.
      const answerAfter = i.mode === 'sync' && !duplicate ? i.workSeconds : 0;
      const sideEffect = !duplicate;
      if (sideEffect) effects[e] = effects[e]! + 1;
      seen.add(e);
      const recorded = answerAfter > i.timeout ? 'timed out' : 'delivered';
      attempts.push({ event: e + 1, attempt: a, recorded, sideEffect });
      if (recorded === 'delivered') break;
    }
  }
  return { attempts, effects, duplicates: effects.reduce((s, x) => s + Math.max(0, x - 1), 0) };
}

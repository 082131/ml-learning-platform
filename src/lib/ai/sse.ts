import type { ExperimentDef } from '../types';
import { seededRandom } from '../classical/random';

/**
 * Server-sent events (SSE): the text format most model APIs use to stream a reply, a real incremental
 * parser for it, and a timing model of streaming versus waiting for the whole reply. The reply text is
 * scripted; the timing follows the stated formula, it is not measured.
 */

export interface SseEvent {
  event: string;
  data: string;
}

/** One event on the wire: `event:` and `data:` lines, ended by a blank line. */
export function encodeEvent(e: SseEvent): string {
  return `event: ${e.event}\n${e.data
    .split('\n')
    .map((l) => `data: ${l}`)
    .join('\n')}\n\n`;
}

/**
 * Parses SSE text that arrives in arbitrary pieces. Lines are only complete at "\n", and events only at
 * a blank line, so a piece can end in the middle of a line or an event; the parser keeps the rest.
 * Lines starting with ":" are comments (often used as keep-alive pings).
 */
export class SseParser {
  private buffer = '';
  private event = 'message';
  private data: string[] = [];

  feed(piece: string): SseEvent[] {
    this.buffer += piece;
    const out: SseEvent[] = [];
    let nl: number;
    while ((nl = this.buffer.indexOf('\n')) >= 0) {
      const line = this.buffer.slice(0, nl).replace(/\r$/, '');
      this.buffer = this.buffer.slice(nl + 1);
      if (line === '') {
        if (this.data.length) out.push({ event: this.event, data: this.data.join('\n') });
        this.event = 'message';
        this.data = [];
      } else if (!line.startsWith(':')) {
        const colon = line.indexOf(':');
        const field = colon < 0 ? line : line.slice(0, colon);
        const value = colon < 0 ? '' : line.slice(colon + 1).replace(/^ /, '');
        if (field === 'event') this.event = value;
        else if (field === 'data') this.data.push(value);
      }
    }
    return out;
  }
}

/** Splits text into `n` pieces at seeded random positions, like network packets. */
export function splitRandomly(text: string, n: number, seed: number): string[] {
  const rand = seededRandom(seed);
  const cuts = new Set<number>();
  while (cuts.size < Math.min(n - 1, text.length - 1)) cuts.add(1 + Math.floor(rand() * (text.length - 1)));
  const sorted = [...cuts].sort((a, b) => a - b);
  return [0, ...sorted].map((c, i) => text.slice(c, sorted[i] ?? text.length));
}

export const REPLY_DELTAS = ['Error', ' E-402', ' means', ' your', ' storage', ' quota', ' is', ' full', ' [1]', '.'];

/** The stream of a scripted reply, shaped like a typical model API: start, text deltas, stop. */
export function replyEvents(deltas: readonly string[] = REPLY_DELTAS): SseEvent[] {
  return [
    { event: 'message_start', data: '{"type":"message_start"}' },
    ...deltas.map((d) => ({ event: 'text_delta', data: JSON.stringify({ type: 'text_delta', text: d }) })),
    { event: 'message_stop', data: '{"type":"message_stop"}' },
  ];
}

export interface StreamState {
  /** Time to first token, in seconds. */
  ttft: number;
  tokensPerSecond: number;
  outputTokens: number;
  /** The client (or a proxy in between) gives up on a request after this many seconds. */
  timeout: number;
  /** How many network pieces the first part of the stream arrives in. */
  pieces: number;
}

export interface StreamResult {
  /** Seconds until the whole reply has been generated. */
  total: number;
  streaming: { firstText: number; ok: boolean; note: string };
  waiting: { firstText: number; ok: boolean; note: string };
  wire: string;
  chunks: string[];
  /** What the parser produced from the pieces, in order. */
  parsed: SseEvent[];
  /** Pieces after which at least one event completed. */
  eventsPerPiece: number[];
  text: string;
}

/** total = TTFT + output tokens / tokens per second. */
export function generationTime(s: Pick<StreamState, 'ttft' | 'tokensPerSecond' | 'outputTokens'>): number {
  return s.ttft + s.outputTokens / s.tokensPerSecond;
}

export function computeStream(s: StreamState): StreamResult {
  const total = generationTime(s);
  // A streamed response sends bytes as soon as the first token exists; the longest silence is the TTFT.
  const streamOk = s.ttft < s.timeout;
  const waitOk = total < s.timeout;
  const wire = replyEvents().map(encodeEvent).join('');
  const chunks = splitRandomly(wire, s.pieces, s.pieces);
  const parser = new SseParser();
  const parsed: SseEvent[] = [];
  const eventsPerPiece = chunks.map((c) => {
    const ev = parser.feed(c);
    parsed.push(...ev);
    return ev.length;
  });
  const text = parsed
    .filter((e) => e.event === 'text_delta')
    .map((e) => (JSON.parse(e.data) as { text: string }).text)
    .join('');
  return {
    total,
    streaming: {
      firstText: s.ttft,
      ok: streamOk,
      note: streamOk ? 'text appears while the rest is generated' : 'timed out before the first token',
    },
    waiting: {
      firstText: total,
      ok: waitOk,
      note: waitOk ? 'nothing shows until the reply is complete' : 'timed out: the whole reply was lost',
    },
    wire,
    chunks,
    parsed,
    eventsPerPiece,
    text,
  };
}

const sec = (x: number) => `${x.toFixed(1)} s`;

export function streamExperiment(id: string, initial: StreamState): ExperimentDef<StreamState, StreamResult> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'slider',
        id: 'ttft',
        label: 'Time to first token (s)',
        min: 0.2,
        max: 5,
        step: 0.2,
        format: (v) => v.toFixed(1),
        get: (s) => s.ttft,
        set: (s, v) => ({ ...s, ttft: Math.round(v * 10) / 10 }),
      },
      {
        kind: 'slider',
        id: 'tps',
        label: 'Output tokens per second',
        min: 10,
        max: 150,
        step: 10,
        get: (s) => s.tokensPerSecond,
        set: (s, v) => ({ ...s, tokensPerSecond: v }),
      },
      {
        kind: 'slider',
        id: 'outputTokens',
        label: 'Reply length (tokens)',
        min: 100,
        max: 2000,
        step: 100,
        get: (s) => s.outputTokens,
        set: (s, v) => ({ ...s, outputTokens: v }),
      },
      {
        kind: 'slider',
        id: 'timeout',
        label: 'Client timeout (s)',
        min: 5,
        max: 60,
        step: 5,
        get: (s) => s.timeout,
        set: (s, v) => ({ ...s, timeout: v }),
      },
      {
        kind: 'slider',
        id: 'pieces',
        label: 'Network pieces',
        min: 1,
        max: 12,
        get: (s) => s.pieces,
        set: (s, v) => ({ ...s, pieces: Math.round(v) }),
      },
    ],
    compute: computeStream,
    readout: (s, r) => [
      { label: 'Generation time', value: `${sec(r.total)} = ${s.ttft} + ${s.outputTokens} / ${s.tokensPerSecond}` },
      {
        label: 'Streaming: first text at',
        value: r.streaming.ok ? sec(r.streaming.firstText) : 'timed out',
        status: r.streaming.ok ? 'ok' : 'error',
      },
      {
        label: 'Waiting: first text at',
        value: r.waiting.ok ? sec(r.waiting.firstText) : 'timed out',
        status: r.waiting.ok ? 'ok' : 'error',
      },
      { label: 'Parsed text', value: r.text },
    ],
  };
}

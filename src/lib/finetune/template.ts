// Chat templates, loss masks and sequence packing. The template is ChatML (used by Qwen and others):
//   <|im_start|>role\ncontent<|im_end|>\n
// Real tokenizers split text into subword tokens; here a "token" is a word, a punctuation mark, a newline or a
// special token, so the counts are illustrative while the masking logic is the same as in TRL's SFTTrainer
// (assistant_only_loss / completion_only_loss): masked positions get the label -100 and add nothing to the loss.

export type Role = 'system' | 'user' | 'assistant';
export interface Message {
  role: Role;
  content: string;
}

export type MaskMode = 'all' | 'assistant' | 'last';

export interface Tok {
  text: string;
  /** The message this token belongs to (-1 for none). */
  message: number;
  role: Role | 'template';
  special: boolean;
  /** Counted in the loss? */
  trained: boolean;
}

export const IGNORE_INDEX = -100;

/** Words, single punctuation marks and newlines. */
export function toyTokenize(text: string): string[] {
  return text.match(/\n|[A-Za-z0-9']+|[^\sA-Za-z0-9']/g) ?? [];
}

/**
 * Render messages with the ChatML template and mark which tokens are trained.
 * - 'all': every token (plain language-model loss over the whole conversation).
 * - 'assistant': only assistant replies, including each reply's closing <|im_end|>, so the model learns to stop.
 * - 'last': only the final assistant reply (the prompt-completion style).
 * The "<|im_start|>assistant\n" header is never trained: it is part of the prompt the model is given at inference.
 */
export function renderChat(messages: readonly Message[], mode: MaskMode, addGenerationPrompt = false): Tok[] {
  const toks: Tok[] = [];
  const lastAssistant = messages.map((m) => m.role).lastIndexOf('assistant');
  messages.forEach((m, i) => {
    const isTarget = m.role === 'assistant' && (mode === 'assistant' || (mode === 'last' && i === lastAssistant));
    const train = (part: 'header' | 'body' | 'end') => (mode === 'all' ? true : isTarget && part !== 'header');
    toks.push({ text: '<|im_start|>', message: i, role: 'template', special: true, trained: train('header') });
    toks.push({ text: m.role, message: i, role: 'template', special: false, trained: train('header') });
    toks.push({ text: '\n', message: i, role: 'template', special: false, trained: train('header') });
    for (const t of toyTokenize(m.content)) toks.push({ text: t, message: i, role: m.role, special: false, trained: train('body') });
    toks.push({ text: '<|im_end|>', message: i, role: 'template', special: true, trained: train('end') });
    toks.push({ text: '\n', message: i, role: 'template', special: false, trained: mode === 'all' });
  });
  if (addGenerationPrompt) {
    for (const text of ['<|im_start|>', 'assistant', '\n'])
      toks.push({ text, message: -1, role: 'template', special: text.startsWith('<|'), trained: false });
  }
  return toks;
}

/** The labels a trainer would build: the token itself where trained, -100 where masked. Token ids are positions here. */
export const labels = (toks: readonly Tok[]): number[] => toks.map((t, i) => (t.trained ? i : IGNORE_INDEX));

export interface MaskSummary {
  total: number;
  trained: number;
  masked: number;
}
export function maskSummary(toks: readonly Tok[]): MaskSummary {
  const trained = toks.filter((t) => t.trained).length;
  return { total: toks.length, trained, masked: toks.length - trained };
}

// ---------- packing ----------

export interface Block {
  /** Lengths of the sequences in this block (after truncation). */
  items: { id: number; length: number }[];
  used: number;
}

export interface PackResult {
  strategy: 'pad' | 'pack';
  blocks: Block[];
  /** Real tokens kept (after truncation). */
  realTokens: number;
  /** Tokens cut off because a sequence was longer than the block. */
  truncated: number;
  /** Padding tokens: block capacity that holds no real token. */
  padding: number;
  /** Real tokens / block capacity. */
  efficiency: number;
}

/**
 * 'pad': one sequence per row, padded to maxLen (the simple batching that wastes compute on padding).
 * 'pack': best-fit decreasing, like TRL's default packing_strategy="bfd": sort by length, put each sequence into the
 * fullest block it still fits in, open a new block if none fits. Sequences longer than maxLen are truncated.
 */
export function pack(lengths: readonly number[], maxLen: number, strategy: 'pad' | 'pack'): PackResult {
  if (maxLen < 1) throw new RangeError('maxLen must be positive');
  const seqs = lengths.map((l, id) => ({ id, length: Math.min(l, maxLen) }));
  const truncated = lengths.reduce((a, l) => a + Math.max(0, l - maxLen), 0);
  let blocks: Block[];
  if (strategy === 'pad') {
    blocks = seqs.map((s) => ({ items: [s], used: s.length }));
  } else {
    blocks = [];
    const sorted = [...seqs].sort((a, b) => b.length - a.length || a.id - b.id);
    for (const s of sorted) {
      let best: Block | undefined;
      for (const b of blocks) if (b.used + s.length <= maxLen && (!best || b.used > best.used)) best = b;
      if (best) {
        best.items.push(s);
        best.used += s.length;
      } else blocks.push({ items: [s], used: s.length });
    }
  }
  const realTokens = seqs.reduce((a, s) => a + s.length, 0);
  const capacity = blocks.length * maxLen;
  return { strategy, blocks, realTokens, truncated, padding: capacity - realTokens, efficiency: capacity ? realTokens / capacity : 0 };
}

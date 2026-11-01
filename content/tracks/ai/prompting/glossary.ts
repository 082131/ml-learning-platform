import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the ai/prompting chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'system-prompt',
    term: 'System prompt',
    short:
      'Instructions sent separately from the user’s message that set the model’s role, rules and output format for the whole conversation.',
    introducedIn: 'ai/prompting/structured-outputs',
    aliases: ['system message', 'system instructions'],
  },
  {
    id: 'few-shot-prompting',
    term: 'Few-shot prompting',
    short:
      'Including a few worked examples of input and desired output in the prompt, so the model copies the pattern.',
    long: 'Zero-shot means instructions only. Examples are often the quickest way to fix a format or a borderline category, but they also cost input tokens on every request.',
    introducedIn: 'ai/prompting/structured-outputs',
    aliases: ['few-shot', 'zero-shot', 'examples in the prompt'],
  },
  {
    id: 'structured-output',
    term: 'Structured output',
    short:
      'Model output in a machine-readable format, usually JSON that follows a schema, so code can use it directly.',
    long: 'Some APIs can constrain generation to a schema; otherwise you ask for JSON in the prompt. Either way, validate before you use it.',
    introducedIn: 'ai/prompting/structured-outputs',
    aliases: ['structured outputs', 'JSON mode', 'structured data'],
  },
  {
    id: 'json-schema',
    term: 'JSON Schema',
    short:
      'A standard way to describe what valid JSON looks like: types, required fields, allowed values and limits.',
    introducedIn: 'ai/prompting/structured-outputs',
    aliases: ['schema'],
  },
] satisfies GlossaryTerm[];

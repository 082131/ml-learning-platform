import { bm25Scores } from './bm25';
import { calculate, formatResult } from './calculator';
import { chunkDocs, type Doc } from './chunking';

/** A JSON Schema subset: an object with typed, described properties, some required. */
export interface ToolSchema {
  type: 'object';
  properties: Record<string, { type: 'string' | 'number' | 'integer'; description: string }>;
  required: string[];
}

export interface ToolDef {
  name: string;
  description: string;
  input_schema: ToolSchema;
}

export type ToolResult = { ok: true; content: string } | { ok: false; error: string };

/** Checks arguments against a schema: an object, required keys present, no unknown keys, right types. */
export function validateArgs(schema: ToolSchema, args: unknown): string[] {
  if (typeof args !== 'object' || args === null || Array.isArray(args)) return ['arguments must be a JSON object'];
  const a = args as Record<string, unknown>;
  const errors = schema.required.filter((k) => !(k in a)).map((k) => `missing required argument "${k}"`);
  for (const [k, v] of Object.entries(a)) {
    const prop = schema.properties[k];
    if (!prop) errors.push(`unknown argument "${k}"`);
    else if (prop.type === 'string' ? typeof v !== 'string' : typeof v !== 'number' || (prop.type === 'integer' && !Number.isInteger(v)))
      errors.push(`"${k}" must be ${prop.type === 'integer' ? 'an integer' : `a ${prop.type}`}`);
  }
  return errors;
}

export const SEARCH_CHUNK = { size: 40, overlap: 10 } as const;
export const SEARCH_RESULTS = 2;

export const TOOLS: ToolDef[] = [
  {
    name: 'calculator',
    description: 'Evaluate an arithmetic expression with + - * / and parentheses. Use it for every calculation.',
    input_schema: {
      type: 'object',
      properties: { expression: { type: 'string', description: 'For example "12 * (3 + 4)"' } },
      required: ['expression'],
    },
  },
  {
    name: 'search_docs',
    description: 'Search the Lumen Notes help center. Returns the best-matching passages with their article titles.',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Keywords or a question' } },
      required: ['query'],
    },
  },
];

/** Runs a tool for real, after validating its arguments. Errors become results the model can read. */
export function runTool(docs: readonly Doc[], name: string, args: unknown): ToolResult {
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) return { ok: false, error: `unknown tool "${name}"` };
  const problems = validateArgs(tool.input_schema, args);
  if (problems.length) return { ok: false, error: `invalid arguments: ${problems.join('; ')}` };
  const a = args as Record<string, string>;
  try {
    if (name === 'calculator') return { ok: true, content: formatResult(calculate(a.expression!)) };
    const chunks = chunkDocs(docs, SEARCH_CHUNK.size, SEARCH_CHUNK.overlap);
    const scores = bm25Scores(a.query!, chunks.map((c) => c.text));
    const best = scores
      .map((score, i) => ({ score, i }))
      .filter((x) => x.score > 0)
      .sort((x, y) => y.score - x.score || x.i - y.i)
      .slice(0, SEARCH_RESULTS);
    if (best.length === 0) return { ok: true, content: 'No matching passages.' };
    return { ok: true, content: best.map(({ i }) => `(${chunks[i]!.title}) ${chunks[i]!.text}`).join('\n') };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

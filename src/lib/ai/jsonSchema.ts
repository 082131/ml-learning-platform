/**
 * A small JSON Schema validator: the subset used by the structured-output lesson (type, properties,
 * required, additionalProperties: false, enum, minimum, maximum, maxLength, items). Error messages give
 * the JSON path, like most validators do. Not a full implementation of the standard.
 */

export type JsonType = 'object' | 'string' | 'integer' | 'number' | 'boolean' | 'array';

export interface Schema {
  type: JsonType;
  properties?: Record<string, Schema>;
  required?: string[];
  additionalProperties?: false;
  enum?: readonly (string | number)[];
  minimum?: number;
  maximum?: number;
  maxLength?: number;
  items?: Schema;
  description?: string;
}

function typeOf(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (typeof v === 'number') return Number.isInteger(v) ? 'integer' : 'number';
  return typeof v;
}

function matches(type: JsonType, v: unknown): boolean {
  const t = typeOf(v);
  return t === type || (type === 'number' && t === 'integer');
}

/** Every way `value` breaks `schema`, as "path: problem" strings. Empty when it is valid. */
export function validate(schema: Schema, value: unknown, path = '$'): string[] {
  if (!matches(schema.type, value)) return [`${path}: expected ${schema.type}, got ${typeOf(value)}`];
  const errors: string[] = [];
  if (schema.enum && !schema.enum.includes(value as string | number))
    errors.push(
      `${path}: ${JSON.stringify(value)} is not one of ${schema.enum.map((e) => JSON.stringify(e)).join(', ')}`,
    );
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum)
      errors.push(`${path}: ${value} is less than the minimum ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum)
      errors.push(`${path}: ${value} is more than the maximum ${schema.maximum}`);
  }
  if (typeof value === 'string' && schema.maxLength !== undefined && [...value].length > schema.maxLength)
    errors.push(`${path}: string is ${[...value].length} characters, longer than ${schema.maxLength}`);
  if (schema.type === 'array' && schema.items) {
    (value as unknown[]).forEach((item, i) => errors.push(...validate(schema.items!, item, `${path}[${i}]`)));
  }
  if (schema.type === 'object') {
    const obj = value as Record<string, unknown>;
    for (const key of schema.required ?? [])
      if (!(key in obj)) errors.push(`${path}: missing required property "${key}"`);
    for (const [key, v] of Object.entries(obj)) {
      const sub = schema.properties?.[key];
      if (sub) errors.push(...validate(sub, v, `${path}.${key}`));
      else if (schema.additionalProperties === false) errors.push(`${path}: unexpected property "${key}"`);
    }
  }
  return errors;
}

export type ParseResult =
  { ok: true; value: unknown; cleaned: string } | { ok: false; error: string; cleaned: string };

const FENCE = /^```(?:json)?\s*\n([\s\S]*?)\n?```$/;

/**
 * Parses a model reply as JSON. With `stripFences`, a reply wrapped in a ```json code fence is unwrapped
 * first. Text around the JSON is never guessed away: it is an error to report and retry.
 */
export function parseReply(raw: string, stripFences: boolean): ParseResult {
  let cleaned = raw.trim();
  if (stripFences) {
    const m = FENCE.exec(cleaned);
    if (m) cleaned = m[1]!.trim();
  }
  try {
    return { ok: true, value: JSON.parse(cleaned), cleaned };
  } catch (e) {
    return { ok: false, error: `not valid JSON (${(e as Error).message})`, cleaned };
  }
}

/** The follow-up message a program sends when a reply fails, so the model can correct itself once. */
export function retryMessage(errors: readonly string[]): string {
  return (
    'Your previous reply did not match the required JSON schema:\n' +
    errors.map((e) => `- ${e}`).join('\n') +
    '\nReply again with only the corrected JSON object, and no other text.'
  );
}

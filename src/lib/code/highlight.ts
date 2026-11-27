import type { HighlighterCore, LanguageRegistration } from 'shiki/core';
import type { CodeExample } from '../types';
import type { CodeToken } from './segments';

export type CodeLanguage = CodeExample['language'];

const THEME = 'mlp';
const PREFIX = '--sh-';

/**
 * Shiki's CSS-variables theme reports colors as `var(--sh-token-keyword)` and so on.
 * We map those to our own classes, so the syntax theme lives in CSS (design-system.md).
 */
const CLASS_BY_TOKEN: Record<string, string> = {
  keyword: 'kw',
  'string-expression': 'str',
  string: 'str',
  constant: 'num',
  comment: 'com',
  function: 'fn',
};

/** Each grammar is its own chunk, fetched the first time a lesson shows that language. */
const GRAMMARS = {
  python: () => import('shiki/langs/python.mjs'),
  sql: () => import('shiki/langs/sql.mjs'),
  bash: () => import('shiki/langs/bash.mjs'),
  json: () => import('shiki/langs/json.mjs'),
  typescript: () => import('shiki/langs/typescript.mjs'),
  yaml: () => import('shiki/langs/yaml.mjs'),
  markdown: () => import('shiki/langs/markdown.mjs'),
  toml: () => import('shiki/langs/toml.mjs'),
  diff: () => import('shiki/langs/diff.mjs'),
  hcl: () => import('shiki/langs/hcl.mjs'),
} satisfies Record<CodeLanguage, () => Promise<{ default: LanguageRegistration[] }>>;

let highlighter: Promise<HighlighterCore> | undefined;
const loaded = new Map<CodeLanguage, Promise<void>>();

/** Loads Shiki once, on first use, with the JS regex engine (no WASM) and the grammars lessons use. */
export async function loadHighlighter(language: CodeLanguage): Promise<HighlighterCore> {
  highlighter ??= (async () => {
    const [{ createHighlighterCore, createCssVariablesTheme }, { createJavaScriptRegexEngine }] =
      await Promise.all([import('shiki/core'), import('shiki/engine/javascript')]);
    return createHighlighterCore({
      themes: [createCssVariablesTheme({ name: THEME, variablePrefix: PREFIX })],
      langs: [],
      engine: createJavaScriptRegexEngine(),
    });
  })();
  const hl = await highlighter;
  if (!loaded.has(language))
    loaded.set(
      language,
      GRAMMARS[language]().then((m) => hl.loadLanguage(m.default)),
    );
  await loaded.get(language);
  return hl;
}

export function tokenClass(color: string | undefined): string | undefined {
  const name = color && /^var\(--sh-token-([a-z-]+)\)$/.exec(color)?.[1];
  return name ? CLASS_BY_TOKEN[name] : undefined;
}

/** Tokenizes source into lines of classed tokens. */
export async function highlight(source: string, language: CodeLanguage): Promise<CodeToken[][]> {
  const hl = await loadHighlighter(language);
  return hl
    .codeToTokensBase(source.replace(/\r\n?/g, '\n'), { lang: language, theme: THEME })
    .map((line) => line.map((t) => ({ content: t.content, cls: tokenClass(t.color) })));
}

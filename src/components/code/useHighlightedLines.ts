import { useEffect, useState } from 'react';
import { highlight, type CodeLanguage } from '@/lib/code/highlight';
import { plainTokens, type CodeToken } from '@/lib/code/segments';

/**
 * Plain lines immediately, highlighted lines once Shiki has loaded. Highlighting is display only:
 * the text, and therefore every annotation range, is the same either way.
 */
export function useHighlightedLines(source: string, language: CodeLanguage): CodeToken[][] {
  const [result, setResult] = useState<{ source: string; lines: CodeToken[][] } | null>(null);
  useEffect(() => {
    let live = true;
    highlight(source, language)
      .then((lines) => live && setResult({ source, lines }))
      .catch(() => undefined); // Keep the plain rendering if the highlighter can't load.
    return () => {
      live = false;
    };
  }, [source, language]);
  return result?.source === source ? result.lines : plainTokens(source);
}

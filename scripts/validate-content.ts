// Fails the build when curriculum, lesson metadata, lesson files or glossary disagree.
import { glossary, metaFiles, tracks } from '../content/index';
import { validateLessonData } from '../src/lib/curriculum/lessonData';
import { validateContent } from '../src/lib/curriculum/validate';

const mdxPaths = Object.keys(import.meta.glob('../content/tracks/**/index.mdx')).map((p) =>
  p.replace(/^\.\./, ''),
);
const codeModules = import.meta.glob<Record<string, unknown>>('../content/tracks/**/code.ts', {
  eager: true,
});
const quizModules = import.meta.glob<Record<string, unknown>>('../content/tracks/**/quiz.ts', {
  eager: true,
});
const errors = [
  ...validateContent({ tracks, metaFiles, mdxPaths, glossary }),
  ...validateLessonData(codeModules, quizModules),
];
if (errors.length) {
  console.error(`Content validation failed (${errors.length}):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(
  `Content valid: ${Object.keys(metaFiles).length} lessons, ${mdxPaths.length} written, ${glossary.length} glossary terms, ` +
    `${Object.keys(codeModules).length} code and ${Object.keys(quizModules).length} quiz files.`,
);

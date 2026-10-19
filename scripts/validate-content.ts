// Fails the build when curriculum, lesson metadata, lesson files or glossary disagree.
import { glossary, metaFiles, tracks } from '../content/index';
import { validateContent } from '../src/lib/curriculum/validate';

const mdxPaths = Object.keys(import.meta.glob('../content/tracks/**/index.mdx')).map((p) =>
  p.replace(/^\.\./, ''),
);
const errors = validateContent({ tracks, metaFiles, mdxPaths, glossary });
if (errors.length) {
  console.error(`Content validation failed (${errors.length}):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(
  `Content valid: ${Object.keys(metaFiles).length} lessons, ${mdxPaths.length} written, ${glossary.length} glossary terms.`,
);

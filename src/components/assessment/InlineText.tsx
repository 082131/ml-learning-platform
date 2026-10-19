/** Plain text from content data, with `inline code` and blank-line paragraphs. No HTML is interpreted. */
export function InlineText({ text, className }: { text: string; className?: string }) {
  return text.split(/\n{2,}/).map((para, p) => (
    <p key={p} className={className}>
      {para.split('`').map((part, i) => (i % 2 ? <code key={i}>{part}</code> : part))}
    </p>
  ));
}

/** Fills `{{name}}` placeholders, as the code blocks do, to get the exact program a learner sees. */
export function fillTemplate(source: string, slots: Record<string, string>): string {
  return source.replace(/\{\{(\w+)\}\}/g, (whole, name: string) => {
    const value = slots[name];
    if (value === undefined) throw new Error(`No value for slot ${whole}`);
    return value;
  });
}

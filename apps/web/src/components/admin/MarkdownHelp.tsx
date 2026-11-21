/** Short help for writing page and blog text (Markdown). */
export function MarkdownHelp() {
  const rows: [string, string][] = [
    ['## Heading', 'Big heading (goes into "On this page")'],
    ['### Smaller heading', 'Small heading (on FAQ pages: a question)'],
    ['**bold**', 'Bold text'],
    ['- item', 'Bullet list'],
    ['1. item', 'Numbered list'],
    ['[text](/post-ad)', 'Link (site pages start with /)'],
    ['> text', 'Highlighted note'],
    ['![photo](https://…)', 'Picture'],
  ];
  return (
    <details className="mt-3 rounded-lg bg-page p-3 text-sm">
      <summary className="cursor-pointer font-semibold">How to format text</summary>
      <table className="mt-2 w-full">
        <tbody>
          {rows.map(([code, what]) => (
            <tr key={code}>
              <td className="py-1 pe-4 font-mono text-xs" dir="ltr">{code}</td>
              <td className="py-1 text-ink-muted">{what}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-ink-muted">Leave an empty line between paragraphs. HTML code is removed.</p>
    </details>
  );
}

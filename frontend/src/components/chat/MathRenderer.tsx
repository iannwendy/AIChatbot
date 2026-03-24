import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import katex from 'katex';

type Segment =
  | { kind: 'text'; raw: string }
  | { kind: 'block_math'; math: string }
  | { kind: 'inline_math'; math: string };

function splitContent(source: string): Segment[] {
  if (!source) return [];

  const segments: Segment[] = [];
  let pos = 0;
  const len = source.length;

  while (pos < len) {
    const nextDollar = source.indexOf('$', pos);

    if (nextDollar === -1) {
      segments.push({ kind: 'text', raw: source.slice(pos) });
      break;
    }

    if (nextDollar > pos) {
      segments.push({ kind: 'text', raw: source.slice(pos, nextDollar) });
      pos = nextDollar;
    }

    if (source.slice(pos, pos + 2) === '$$') {
      const close = source.indexOf('$$', pos + 2);
      if (close !== -1) {
        const math = source.slice(pos + 2, close).trim();
        if (math) segments.push({ kind: 'block_math', math });
        pos = close + 2;
      } else {
        segments.push({ kind: 'text', raw: '$$' });
        pos += 2;
      }
    } else {
      const close = source.indexOf('$', pos + 1);
      if (close !== -1 && source[close + 1] !== '$') {
        const math = source.slice(pos + 1, close).trim();
        if (math) segments.push({ kind: 'inline_math', math });
        pos = close + 1;
      } else {
        segments.push({ kind: 'text', raw: '$' });
        pos += 1;
      }
    }
  }

  return segments;
}

function katexHtml(math: string, isBlock: boolean): string {
  try {
    return katex.renderToString(math, {
      displayMode: isBlock,
      throwOnError: false,
      output: 'html',
    });
  } catch {
    return math;
  }
}

interface MathRendererProps {
  content: string;
}

export const MathRenderer: React.FC<MathRendererProps> = ({ content }) => {
  // Compute segments once per content value
  const segments = useMemo(() => splitContent(content), [content]);

  // Collect consecutive text segments → render as one ReactMarkdown
  // This prevents ReactMarkdown re-rendering issues during streaming
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < segments.length) {
    if (segments[i].kind === 'text') {
      // Collect all consecutive text segments
      const textParts: string[] = [];
      while (i < segments.length && segments[i].kind === 'text') {
        textParts.push((segments[i] as { kind: 'text'; raw: string }).raw);
        i++;
      }
      // Render as single ReactMarkdown (handles bold, italic, headers, lists, code, tables...)
      nodes.push(
        <ReactMarkdown key={`text-${nodes.length}`} remarkPlugins={[remarkGfm]}>
          {textParts.join('')}
        </ReactMarkdown>,
      );
    } else if (segments[i].kind === 'block_math') {
      nodes.push(
        <span
          key={`math-${nodes.length}`}
          dangerouslySetInnerHTML={{ __html: katexHtml((segments[i] as { kind: 'block_math'; math: string }).math, true) }}
          style={{ display: 'block', margin: '10px 0', overflowX: 'auto' }}
        />,
      );
      i++;
    } else {
      // inline math
      nodes.push(
        <span
          key={`math-${nodes.length}`}
          dangerouslySetInnerHTML={{ __html: katexHtml((segments[i] as { kind: 'inline_math'; math: string }).math, false) }}
        />,
      );
      i++;
    }
  }

  return <>{nodes}</>;
};

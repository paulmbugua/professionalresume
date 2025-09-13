import React from 'react';
import ReactMarkdown, {
  type Components,
  type Options as ReactMarkdownOptions,
} from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

/**
 * Our wrapper adds:
 * - className (applied on a wrapping <div>)
 * - inline (render paragraphs as <span> for inline usage, e.g., inside buttons)
 */
type MarkdownProps = Omit<
  ReactMarkdownOptions,
  'children' | 'remarkPlugins' | 'rehypePlugins' | 'components'
> & {
  children: string;
  className?: string;
  inline?: boolean;
  components?: Components;
};

export default function Markdown({
  children,
  className,
  inline = false,
  components,
  ...rest
}: MarkdownProps) {
  // Build the markdown element without className (types for your version don’t allow it)
  const md = (
    <ReactMarkdown
      {...rest}
      // Cast to quiet older type signatures
      remarkPlugins={[remarkGfm, remarkMath] as unknown as any}
      rehypePlugins={[rehypeKatex] as unknown as any}
      components={{
        ...components,
        ...(inline
          ? {
              // Render paragraphs inline when desired (nice for buttons/options)
              p: ({ children }) => <span>{children}</span>,
            }
          : {}),
      }}
    >
      {children}
    </ReactMarkdown>
  );

  // Apply styling to a wrapper instead of ReactMarkdown itself
  return className ? <div className={className}>{md}</div> : md;
}

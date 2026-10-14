import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import type { Components } from "react-markdown";

const SAFE_URL_PATTERN = /^(https?:|mailto:)/i;

const components: Components = {
  a: ({ href, children, ...props }) => {
    const safe = typeof href === "string" && SAFE_URL_PATTERN.test(href);
    if (!safe) return <span>{children}</span>;
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    );
  },
  // react-markdown does not render raw HTML by default (no rehype-raw plugin
  // is used here), so arbitrary model-generated HTML/scripts are never executed.
};

export function MathText({ text, className }: { text: string; className?: string }) {
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}

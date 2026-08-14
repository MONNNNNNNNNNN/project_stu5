import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Renders article bodies. Article content is stored as markdown, and the article page
 * used to print it verbatim inside a <pre>-ish block — so readers saw literal "##" and
 * "|" characters instead of headings and tables.
 *
 * react-markdown builds React elements rather than injecting HTML, so there's no
 * dangerouslySetInnerHTML and no HTML-injection surface even though this content comes
 * back from the API.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      // Tables are GitHub-flavoured markdown, not core markdown — without this plugin the
      // nutrition article's nutrient table renders as a wall of pipe characters.
      remarkPlugins={[remarkGfm]}
      components={{
        h1: (props) => <h1 className="font-heading font-bold text-2xl text-ink mt-8 mb-3 first:mt-0" {...props} />,
        h2: (props) => <h2 className="font-heading font-bold text-xl text-ink mt-8 mb-3 first:mt-0" {...props} />,
        h3: (props) => <h3 className="font-heading font-semibold text-base text-ink mt-6 mb-2" {...props} />,
        p: (props) => <p className="text-[15px] leading-7 text-ink mb-4" {...props} />,
        ul: (props) => <ul className="list-disc pl-5 mb-4 flex flex-col gap-1.5 text-[15px] leading-7 text-ink" {...props} />,
        ol: (props) => <ol className="list-decimal pl-5 mb-4 flex flex-col gap-1.5 text-[15px] leading-7 text-ink" {...props} />,
        strong: (props) => <strong className="font-semibold text-ink" {...props} />,
        hr: () => <hr className="my-8 border-brand-100" />,
        a: (props) => (
          <a className="text-brand-600 underline underline-offset-2 hover:text-brand-700" target="_blank" rel="noopener noreferrer" {...props} />
        ),
        blockquote: (props) => (
          <blockquote className="border-l-4 border-brand-200 pl-4 italic text-gray-500 mb-4" {...props} />
        ),
        table: (props) => (
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm border border-brand-100 rounded-lg overflow-hidden" {...props} />
          </div>
        ),
        thead: (props) => <thead className="bg-brand-50" {...props} />,
        th: (props) => <th className="text-left font-semibold text-ink px-3 py-2 border-b border-brand-100" {...props} />,
        td: (props) => <td className="px-3 py-2 border-b border-brand-100 text-ink align-top" {...props} />,
        code: (props) => <code className="font-mono text-[13px] bg-brand-50 px-1.5 py-0.5 rounded" {...props} />,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

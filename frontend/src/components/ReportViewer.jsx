import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, CircleCheck } from 'lucide-react';

export default function ReportViewer({ report }) {
  if (!report) return null;

  return (
    <div className="animate-slideUp mt-2">
      {/* Report header */}
      <div className="flex items-center justify-between px-5 py-3 bg-terminal-surface/60 border border-terminal-green/30 rounded-t-xl border-b-0">
        <div className="flex items-center gap-2 text-terminal-green glow-green">
          <CircleCheck size={15} />
          <span className="font-mono text-xs font-bold uppercase tracking-widest">Research Complete</span>
        </div>
        <div className="flex items-center gap-2 text-terminal-muted font-mono text-xs">
          <FileText size={12} />
          <span>{Math.ceil(report.length / 5)} words</span>
        </div>
      </div>

      {/* Markdown content area */}
      <div className="
        bg-terminal-surface/40 border border-terminal-green/30 rounded-b-xl
        p-8 overflow-y-auto max-h-[70vh]
        glow-border
      ">
        <div className="prose prose-sm max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            /* Custom renderers for terminal aesthetic */
            h1: ({ children }) => (
              <h1 className="text-2xl font-bold text-terminal-green glow-green mb-4 mt-0 pb-3 border-b border-terminal-border font-mono">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-lg font-bold text-terminal-blue mt-6 mb-3 flex items-center gap-2 font-mono">
                <span className="text-terminal-green/50">##</span> {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-base font-semibold text-terminal-purple mt-4 mb-2 font-mono">
                {children}
              </h3>
            ),
            p: ({ children }) => (
              <p className="text-slate-300 leading-7 mb-4">{children}</p>
            ),
            strong: ({ children }) => (
              <strong className="text-white font-semibold">{children}</strong>
            ),
            code: ({ inline, children }) =>
              inline ? (
                <code className="bg-terminal-dim text-terminal-green px-1.5 py-0.5 rounded text-xs font-mono">
                  {children}
                </code>
              ) : (
                <code className="block bg-terminal-bg border border-terminal-border rounded-lg p-4 text-terminal-green font-mono text-xs overflow-x-auto">
                  {children}
                </code>
              ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-2 border-terminal-green/40 pl-4 italic text-slate-400">
                {children}
              </blockquote>
            ),
            ul: ({ children }) => (
              <ul className="list-none space-y-1.5 mb-4">{children}</ul>
            ),
            li: ({ children }) => (
              <li className="flex gap-2 text-slate-300">
                <span className="text-terminal-green/60 flex-shrink-0 mt-1">▸</span>
                <span>{children}</span>
              </li>
            ),
            table: ({ children }) => (
              <div className="overflow-x-auto my-4">
                <table className="w-full border-collapse text-sm">{children}</table>
              </div>
            ),
            th: ({ children }) => (
              <th className="text-left text-terminal-green font-mono text-xs uppercase tracking-wider p-2 border-b border-terminal-border">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="p-2 border-b border-terminal-border/40 text-slate-300 text-sm">
                {children}
              </td>
            ),
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noopener noreferrer"
                className="text-terminal-blue hover:text-terminal-green underline underline-offset-2 transition-colors">
                {children}
              </a>
            ),
            hr: () => <hr className="border-terminal-border my-6" />,
          }}
        >
          {report}
        </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

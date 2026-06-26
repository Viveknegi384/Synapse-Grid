import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, CircleCheck } from 'lucide-react';

export default function ReportViewer({ report }) {
  if (!report) return null;

  // rough word count: avg 5 chars per word
  const wordCount = Math.ceil(report.length / 5);

  return (
    <div className="animate-[slideUp_0.4s_ease-out] mt-2">
      <div className="flex items-center justify-between px-5 py-3 bg-[#0f1623]/80 border border-[#00ff88]/20 rounded-t-xl border-b-0">
        <div className="flex items-center gap-2 text-[#00ff88]" style={{ textShadow: '0 0 6px rgba(0,255,136,0.4)' }}>
          <CircleCheck size={14} />
          <span className="font-mono text-xs font-bold uppercase tracking-widest">Research Complete</span>
        </div>
        <div className="flex items-center gap-1.5 text-[#4a5568] font-mono text-xs">
          <FileText size={12} />
          <span>~{wordCount} words</span>
        </div>
      </div>

      <div className="bg-[#0f1623]/50 border border-[#00ff88]/20 rounded-b-xl p-6 sm:p-8 overflow-y-auto max-h-[70vh]">
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h1 className="text-2xl font-bold text-[#00ff88] mb-4 mt-0 pb-3 border-b border-[#1e2d45] font-mono">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-lg font-bold text-[#38bdf8] mt-6 mb-3 flex items-center gap-2 font-mono">
                  <span className="text-[#00ff88]/40">##</span> {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-base font-semibold text-[#a78bfa] mt-4 mb-2 font-mono">
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="text-slate-300 leading-7 mb-4">{children}</p>
              ),
              strong: ({ children }) => (
                <strong className="text-white font-semibold">{children}</strong>
              ),
              // inline vs block code — react-markdown passes node.inline
              code: ({ inline, children }) =>
                inline ? (
                  <code className="bg-[#1e293b] text-[#00ff88] px-1.5 py-0.5 rounded text-xs font-mono">
                    {children}
                  </code>
                ) : (
                  <code className="block bg-[#0a0e17] border border-[#1e2d45] rounded-lg p-4 text-[#00ff88] font-mono text-xs overflow-x-auto">
                    {children}
                  </code>
                ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-[#00ff88]/30 pl-4 italic text-slate-400">
                  {children}
                </blockquote>
              ),
              ul: ({ children }) => (
                <ul className="list-none space-y-1.5 mb-4">{children}</ul>
              ),
              li: ({ children }) => (
                <li className="flex gap-2 text-slate-300">
                  <span className="text-[#00ff88]/50 flex-shrink-0 mt-1">▸</span>
                  <span>{children}</span>
                </li>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto my-4">
                  <table className="w-full border-collapse text-sm">{children}</table>
                </div>
              ),
              th: ({ children }) => (
                <th className="text-left text-[#00ff88] font-mono text-xs uppercase tracking-wider p-2 border-b border-[#1e2d45]">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="p-2 border-b border-[#1e2d45]/40 text-slate-300 text-sm">
                  {children}
                </td>
              ),
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer"
                  className="text-[#38bdf8] hover:text-[#00ff88] underline underline-offset-2 transition-colors">
                  {children}
                </a>
              ),
              hr: () => <hr className="border-[#1e2d45] my-6" />,
            }}
          >
            {report}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

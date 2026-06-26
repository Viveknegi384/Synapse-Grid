import { useState, useRef } from 'react';
import { Search, Cpu, Zap } from 'lucide-react';

export default function SearchBox({ onStartResearch, isResearching }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || isResearching) return;
    onStartResearch(trimmed);
  }

  return (
    <div className="w-full animate-[fadeIn_0.3s_ease-in]">

      <div className="flex items-center gap-2 mb-2 font-mono text-xs text-[#4a5568]">
        <span className="text-[#00ff88]" style={{ textShadow: '0 0 6px rgba(0,255,136,0.5)' }}>$</span>
        <span>research_grid</span>
        <span className="text-[#38bdf8]">~</span>
        <span className="animate-[blink_1s_step-end_infinite]">▋</span>
      </div>

      <form onSubmit={handleSubmit}>
        <div className={`
          flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3
          px-3 sm:px-4 py-3 sm:py-3.5 rounded-xl border transition-all duration-300
          bg-[#0f1623]/80 backdrop-blur-sm
          ${isResearching
            ? 'border-[#38bdf8]/50 shadow-[0_0_20px_rgba(56,189,248,0.08)]'
            : 'border-[#1e2d45] hover:border-[#00ff88]/30 focus-within:border-[#00ff88]/50 focus-within:shadow-[0_0_20px_rgba(0,255,136,0.06)]'
          }
        `}>
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div className={`flex-shrink-0 transition-colors duration-300 ${
              isResearching ? 'text-[#38bdf8] animate-pulse' : 'text-[#4a5568]'
            }`}>
              {isResearching ? <Cpu size={16} /> : <Search size={16} />}
            </div>

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isResearching}
              placeholder="Enter a research topic…"
              className="
                flex-1 min-w-0 bg-transparent border-none outline-none
                font-mono text-sm text-[#00ff88] placeholder:text-[#4a5568]/60
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            />
          </div>

          <button
            type="submit"
            disabled={!query.trim() || isResearching}
            className={`
              flex items-center justify-center gap-2
              px-5 py-2.5 sm:py-2 rounded-lg flex-shrink-0
              font-mono text-xs font-bold tracking-wider uppercase
              transition-all duration-200
              ${!query.trim() || isResearching
                ? 'bg-[#1e293b] text-[#4a5568] cursor-not-allowed'
                : 'bg-[#00ff88] text-[#0a0e17] hover:brightness-110 active:scale-95 shadow-[0_0_12px_rgba(0,255,136,0.25)]'
              }
            `}
          >
            {isResearching ? (
              <>
                <Zap size={13} className="animate-pulse" />
                <span>Running…</span>
              </>
            ) : (
              <>
                <Zap size={13} />
                <span>Run Research</span>
              </>
            )}
          </button>
        </div>
      </form>

      <p className="mt-2 font-mono text-[10px] sm:text-xs text-[#4a5568]/50 pl-1">
        {isResearching
          ? '⚡ Agents working — logs stream in real-time below'
          : 'Enter a topic and press Run to start the multi-agent pipeline'}
      </p>
    </div>
  );
}

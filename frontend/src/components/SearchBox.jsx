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
    <div className="w-full animate-fadeIn">
      {/* Terminal prompt header */}
      <div className="flex items-center gap-2 mb-3 font-mono text-xs text-terminal-muted">
        <span className="text-terminal-green glow-green">$</span>
        <span>research_grid</span>
        <span className="text-terminal-blue">~</span>
        <span className="animate-blink">▋</span>
      </div>

      <form onSubmit={handleSubmit} className="relative group">
        <div className={`
          relative flex items-center gap-3 px-4 py-4 rounded-xl border transition-all duration-300
          bg-terminal-surface/80 backdrop-blur-sm
          ${isResearching
            ? 'border-terminal-blue/50 shadow-[0_0_20px_rgba(56,189,248,0.1)]'
            : 'border-terminal-border hover:border-terminal-green/40 group-focus-within:border-terminal-green/60 group-focus-within:shadow-[0_0_20px_rgba(0,255,136,0.08)]'
          }
        `}>
          {/* Icon */}
          <div className={`flex-shrink-0 transition-colors duration-300 ${
            isResearching ? 'text-terminal-blue animate-pulse' : 'text-terminal-muted group-focus-within:text-terminal-green'
          }`}>
            {isResearching ? <Cpu size={18} /> : <Search size={18} />}
          </div>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isResearching}
            placeholder="Enter a research topic (e.g. Latest advances in solid-state batteries)"
            className="
              flex-1 bg-transparent border-none outline-none
              font-mono text-sm text-terminal-green placeholder:text-terminal-muted/60
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          />

          {/* Submit button */}
          <button
            type="submit"
            disabled={!query.trim() || isResearching}
            className={`
              flex items-center gap-2 px-5 py-2 rounded-lg
              font-mono text-xs font-bold tracking-wider uppercase
              transition-all duration-200
              ${!query.trim() || isResearching
                ? 'bg-terminal-dim text-terminal-muted cursor-not-allowed'
                : 'bg-terminal-green text-terminal-bg hover:brightness-110 active:scale-95 shadow-[0_0_12px_rgba(0,255,136,0.3)]'
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
                <span>Run</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Status hint */}
      <p className="mt-2 font-mono text-xs text-terminal-muted/60 pl-1">
        {isResearching
          ? '⚡ Agents are working — results stream in real-time below'
          : 'Press Enter or click Run to launch the research pipeline'}
      </p>
    </div>
  );
}

import { useEffect, useRef } from 'react';
import { Terminal, Wifi } from 'lucide-react';

// Color map for each agent name
const AGENT_COLORS = {
  SearchAgent:  'text-terminal-blue',
  ScrapeAgent:  'text-terminal-purple',
  WriterAgent:  'text-terminal-green',
  CriticAgent:  'text-terminal-orange',
  System:       'text-terminal-red',
  connected:    'text-terminal-muted',
};

const AGENT_PREFIXES = {
  SearchAgent:  '🔍',
  ScrapeAgent:  '🕸️',
  WriterAgent:  '✍️',
  CriticAgent:  '🔬',
  System:       '⚠️',
  connected:    '🔗',
};

export default function AgentTerminal({ logs, isResearching }) {
  const bottomRef = useRef(null);

  // Auto-scroll to bottom on every new log
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="animate-slideUp">
      {/* Terminal header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-terminal-surface/60 border border-terminal-border rounded-t-xl border-b-0">
        <div className="flex items-center gap-2">
          {/* MacOS-style traffic lights */}
          <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <span className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-terminal-muted">
          <Terminal size={12} />
          <span>agent_terminal</span>
          {isResearching && (
            <span className="flex items-center gap-1 text-terminal-green glow-green">
              <Wifi size={11} className="animate-pulse" />
              <span>live</span>
            </span>
          )}
        </div>
        <span className="font-mono text-xs text-terminal-muted">
          {logs.length} event{logs.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Log body */}
      <div className="
        relative h-72 overflow-y-auto
        bg-terminal-bg border border-terminal-border rounded-b-xl
        font-mono text-xs leading-relaxed p-4
        terminal-scanlines
      ">
        {/* Empty state */}
        {logs.length === 0 && (
          <div className="flex items-center gap-2 text-terminal-muted/50">
            <span className="animate-blink">▋</span>
            <span>Waiting for agent activity…</span>
          </div>
        )}

        {/* Log lines */}
        {logs.map((log, i) => {
          const colorClass = AGENT_COLORS[log.agentName] || 'text-terminal-muted';
          const prefix = AGENT_PREFIXES[log.agentName] || '•';
          const time = log.timestamp
            ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            : '';

          return (
            <div
              key={i}
              className="flex gap-3 mb-1 animate-fadeIn group hover:bg-terminal-surface/30 px-1 rounded"
            >
              {/* Timestamp */}
              <span className="text-terminal-muted/40 whitespace-nowrap flex-shrink-0 pt-px">
                [{time}]
              </span>
              {/* Agent label */}
              <span className={`${colorClass} font-bold whitespace-nowrap flex-shrink-0 min-w-[100px]`}>
                {prefix} {log.agentName}
              </span>
              {/* Message */}
              <span className="text-terminal-green/80 break-all">
                {log.logMessage || log.message}
              </span>
            </div>
          );
        })}

        {/* Live cursor at bottom when active */}
        {isResearching && (
          <div className="flex items-center gap-2 mt-1 text-terminal-green/50">
            <span className="animate-blink">▋</span>
          </div>
        )}

        {/* Auto-scroll anchor */}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

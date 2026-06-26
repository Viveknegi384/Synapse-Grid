import { useEffect, useRef } from 'react';
import { Terminal, Wifi } from 'lucide-react';

const AGENT_COLORS = {
  SearchAgent: '#79c0ff',
  ScrapeAgent: '#d2a8ff',
  WriterAgent: '#56d364',
  CriticAgent: '#ffa657',
  System:      '#f85149',
  connected:   '#4a5568',
};

export default function AgentTerminal({ logs, isResearching }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="w-full animate-[slideUp_0.4s_ease-out]">

      <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-[#0f1623]/80 border border-[#1e2d45] rounded-t-xl border-b-0">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px] sm:text-xs text-[#4a5568]">
          <Terminal size={11} />
          <span>agent_terminal</span>
          {isResearching && (
            <span className="flex items-center gap-1 text-[#00ff88]" style={{ textShadow: '0 0 6px rgba(0,255,136,0.5)' }}>
              <Wifi size={10} className="animate-pulse" />
              <span>live</span>
            </span>
          )}
        </div>
        <span className="font-mono text-[10px] sm:text-xs text-[#4a5568]">
          {logs.length} event{logs.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="
        relative h-56 sm:h-72 overflow-y-auto
        bg-[#0a0e17] border border-[#1e2d45] rounded-b-xl
        p-3 sm:p-4 font-mono text-[11px] sm:text-xs leading-relaxed
      ">
        {logs.length === 0 && (
          <div className="flex items-center gap-2 text-[#4a5568]/50">
            <span className="animate-[blink_1s_step-end_infinite]">▋</span>
            <span>Waiting for agent activity…</span>
          </div>
        )}

        {logs.map((log, i) => {
          const color = AGENT_COLORS[log.agentName] || '#4a5568';
          const time  = log.timestamp
            ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            : '';

          return (
            <div
              key={i}
              className="flex gap-2 sm:gap-3 mb-1 animate-[fadeIn_0.3s_ease-in] hover:bg-[#0f1623]/60 px-1 py-0.5 rounded"
            >
              <span className="text-[#4a5568]/40 whitespace-nowrap flex-shrink-0 hidden xs:inline pt-px">
                [{time}]
              </span>
              <span
                className="font-bold whitespace-nowrap flex-shrink-0 min-w-[90px] sm:min-w-[110px]"
                style={{ color }}
              >
                {log.agentName}
              </span>
              <span className="text-[#00ff88]/70 break-words min-w-0 flex-1">
                {log.logMessage || log.message}
              </span>
            </div>
          );
        })}

        {isResearching && (
          <div className="flex items-center gap-2 mt-1 text-[#00ff88]/30">
            <span className="animate-[blink_1s_step-end_infinite]">▋</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

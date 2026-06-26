import { useState, useRef, useCallback } from 'react';
import { BrainCircuit, ExternalLink, Cpu, CircleDot } from 'lucide-react';
import SearchBox from './components/SearchBox.jsx';
import AgentTerminal from './components/AgentTerminal.jsx';
import ReportViewer from './components/ReportViewer.jsx';

// Falls back to localhost for local dev; set VITE_API_URL in production
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function App() {
  const [sessionId,     setSessionId]     = useState(null);
  const [isResearching, setIsResearching] = useState(false);
  const [logs,          setLogs]          = useState([]);
  const [finalReport,   setFinalReport]   = useState('');
  const [error,         setError]         = useState('');
  const [status,        setStatus]        = useState('idle');

  // holds the active EventSource so we can close it on re-run
  const eventSourceRef = useRef(null);

  const startResearch = useCallback(async (query) => {
    setLogs([]);
    setFinalReport('');
    setError('');
    setStatus('running');
    setIsResearching(true);

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    let newSessionId;
    try {
      const res = await fetch(`${API_BASE}/api/research/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      newSessionId = data.session.id;
      setSessionId(newSessionId);
      setLogs([{
        agentName: 'connected',
        logMessage: `Session #${newSessionId} created. Connecting to live stream…`,
        timestamp: new Date().toISOString(),
      }]);
    } catch (err) {
      setError(`Failed to create session: ${err.message}`);
      setStatus('failed');
      setIsResearching(false);
      return;
    }

    const es = new EventSource(`${API_BASE}/api/research/stream/${newSessionId}`);
    eventSourceRef.current = es;

    es.onmessage = async (e) => {
      let payload;
      try { payload = JSON.parse(e.data); } catch { return; }

      if (payload.type === 'agent_update') {
        setLogs((prev) => [...prev, {
          agentName:  payload.agentName,
          logMessage: payload.logMessage,
          timestamp:  payload.timestamp,
        }]);
      }

      if (payload.type === 'workflow_complete') {
        setLogs((prev) => [...prev, {
          agentName:  'connected',
          logMessage: '✅ Workflow complete. Fetching final report…',
          timestamp:  new Date().toISOString(),
        }]);
        es.close();

        // pull the finished report from REST after SSE closes
        try {
          const r = await fetch(`${API_BASE}/api/research/session/${newSessionId}`);
          const data = await r.json();
          if (data.report?.report_content) setFinalReport(data.report.report_content);
        } catch (err) {
          setError(`Could not fetch report: ${err.message}`);
        }
        setStatus('completed');
        setIsResearching(false);
      }

      if (payload.type === 'workflow_error') {
        setLogs((prev) => [...prev, {
          agentName:  'System',
          logMessage: `❌ Error: ${payload.error || 'Unknown error'}`,
          timestamp:  new Date().toISOString(),
        }]);
        setError(payload.error || 'Workflow failed');
        setStatus('failed');
        setIsResearching(false);
        es.close();
      }
    };

    // read status via functional update to avoid stale closure
    es.onerror = () => {
      es.close();
      setStatus((s) => {
        if (s === 'running') {
          setError('SSE connection lost unexpectedly.');
          setIsResearching(false);
          return 'failed';
        }
        return s;
      });
    };
  }, []);

  const statusDot = {
    idle:      { color: 'text-[#4a5568]',                          label: 'idle' },
    running:   { color: 'text-[#38bdf8] animate-pulse',            label: 'processing' },
    completed: { color: 'text-[#00ff88]',                          label: 'completed' },
    failed:    { color: 'text-[#f87171]',                          label: 'failed' },
  }[status];

  return (
    <div className="min-h-screen bg-[#0a0e17] text-white flex flex-col">

      <header className="border-b border-[#1e2d45]/80 bg-[#0f1623]/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">

          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex-shrink-0">
              <BrainCircuit size={24} className="text-[#00ff88]" style={{ filter: 'drop-shadow(0 0 6px rgba(0,255,136,0.5))' }} />
              {isResearching && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#38bdf8] rounded-full animate-ping" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="font-mono font-bold text-sm sm:text-base text-white tracking-tight leading-none truncate">
                Synapse <span className="text-[#00ff88]" style={{ textShadow: '0 0 8px rgba(0,255,136,0.5)' }}>Grid</span>
              </h1>
              <p className="text-[#4a5568] text-[10px] sm:text-xs font-mono mt-0.5 hidden sm:block truncate">
                Autonomous Multi-Agent AI Research Platform
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <div className={`flex items-center gap-1 sm:gap-1.5 font-mono text-[10px] sm:text-xs ${statusDot.color}`}>
              <CircleDot size={10} />
              <span className="hidden sm:inline">{statusDot.label}</span>
            </div>

            {sessionId && (
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1e293b] border border-[#1e2d45] font-mono text-[10px] text-[#4a5568]">
                <Cpu size={10} />
                <span>#{sessionId}</span>
              </div>
            )}

            {sessionId && (
              <div className="flex md:hidden items-center gap-1 px-2 py-0.5 rounded-full bg-[#1e293b] font-mono text-[10px] text-[#4a5568]">
                <Cpu size={9} />
                <span>#{sessionId}</span>
              </div>
            )}

            <a
              href="https://github.com/Viveknegi384/Synapse-Grid"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#4a5568] hover:text-[#00ff88] transition-colors p-1"
            >
              <ExternalLink size={15} />
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col gap-6 sm:gap-8">

        {status === 'idle' && (
          <div className="py-6 sm:py-10 animate-[fadeIn_0.3s_ease-in] w-full">
            <div className="flex flex-col items-center justify-center text-center w-full">

              <p className="font-mono text-[#00ff88]/50 text-[10px] tracking-[0.25em] uppercase mb-4">
                [ AI RESEARCH AUTOMATION ]
              </p>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5 leading-tight">
                Deep Research,{' '}
                <span className="text-[#00ff88]" style={{ textShadow: '0 0 16px rgba(0,255,136,0.35)' }}>
                  Zero Effort
                </span>
              </h2>

              <p className="text-center mx-auto max-w-2xl text-gray-400 text-sm sm:text-base leading-relaxed mt-4 px-2">
                Enter a topic. Four specialized AI agents search the web, scrape sources,
                write a structured report, and self-review it — all in real-time.
              </p>

              <div className="flex flex-wrap justify-center gap-3 mt-6 w-full">
                {['SearchAgent', 'ScrapeAgent', 'WriterAgent', 'CriticAgent'].map((name) => (
                  <span
                    key={name}
                    className="font-mono text-[11px] text-[#4a5568] bg-[#0f1623] border border-[#1e2d45] rounded px-2.5 py-1 tracking-wide hover:border-[#00ff88]/20 hover:text-[#6b7280] transition-colors duration-200"
                  >
                    &lt;{name} /&gt;
                  </span>
                ))}
              </div>

            </div>
          </div>
        )}

        <SearchBox onStartResearch={startResearch} isResearching={isResearching} />

        {error && (
          <div className="px-4 py-3 rounded-lg border border-[#f87171]/30 bg-[#f87171]/5 font-mono text-xs text-[#f87171] animate-[fadeIn_0.3s_ease-in] flex items-start gap-2">
            <span className="flex-shrink-0 mt-0.5">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {(isResearching || logs.length > 0) && (
          <AgentTerminal logs={logs} isResearching={isResearching} />
        )}

        {finalReport && (
          <ReportViewer report={finalReport} />
        )}
      </main>

      <footer className="border-t border-[#1e2d45]/40 py-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-1 font-mono text-[10px] sm:text-xs text-[#4a5568]/50">
          <span>Synapse Grid · Phase 4</span>
          <span>Powered by Groq · LangGraph · Tavily</span>
        </div>
      </footer>
    </div>
  );
}

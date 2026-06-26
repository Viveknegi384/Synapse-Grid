import { useState, useRef, useCallback } from 'react';
import { BrainCircuit, ExternalLink, Cpu, CircleDot } from 'lucide-react';
import SearchBox from './components/SearchBox.jsx';
import AgentTerminal from './components/AgentTerminal.jsx';
import ReportViewer from './components/ReportViewer.jsx';

const API_BASE = 'http://localhost:5000';

export default function App() {
  const [sessionId,    setSessionId]    = useState(null);
  const [isResearching, setIsResearching] = useState(false);
  const [logs,         setLogs]         = useState([]);
  const [finalReport,  setFinalReport]  = useState('');
  const [error,        setError]        = useState('');
  const [status,       setStatus]       = useState('idle'); // idle | running | completed | failed

  const eventSourceRef = useRef(null);

  const startResearch = useCallback(async (query) => {
    // Reset state for a new run
    setLogs([]);
    setFinalReport('');
    setError('');
    setStatus('running');
    setIsResearching(true);

    // Close any existing SSE connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // ── 1. Create session ────────────────────────────────────
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

      // Add a synthetic "connected" log entry
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

    // ── 2. Open SSE stream ───────────────────────────────────
    const es = new EventSource(`${API_BASE}/api/research/stream/${newSessionId}`);
    eventSourceRef.current = es;

    es.onmessage = async (e) => {
      let payload;
      try { payload = JSON.parse(e.data); }
      catch { return; }

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

        // Fetch the final report via REST
        try {
          const r = await fetch(`${API_BASE}/api/research/session/${newSessionId}`);
          const data = await r.json();
          if (data.report?.report_content) {
            setFinalReport(data.report.report_content);
          }
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

    es.onerror = () => {
      if (status === 'running') {
        setError('SSE connection lost unexpectedly.');
        setStatus('failed');
        setIsResearching(false);
      }
      es.close();
    };
  }, []);

  const statusDot = {
    idle:      { color: 'text-terminal-muted', label: 'idle' },
    running:   { color: 'text-terminal-blue animate-pulse', label: 'processing' },
    completed: { color: 'text-terminal-green glow-green', label: 'completed' },
    failed:    { color: 'text-terminal-red', label: 'failed' },
  }[status];

  return (
    <div className="min-h-screen bg-terminal-bg text-white flex flex-col">

      {/* ── Header ──────────────────────────────────────────── */}
      <header className="border-b border-terminal-border/50 bg-terminal-surface/30 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <BrainCircuit size={28} className="text-terminal-green glow-green" />
              {isResearching && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-terminal-blue rounded-full animate-ping" />
              )}
            </div>
            <div>
              <h1 className="font-mono font-bold text-lg text-white tracking-tight leading-none">
                DeepNode <span className="text-terminal-green glow-green">Research Grid</span>
              </h1>
              <p className="text-terminal-muted text-xs font-mono mt-0.5">
                Autonomous Multi-Agent AI Research Platform
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Status indicator */}
            <div className={`flex items-center gap-1.5 font-mono text-xs ${statusDot.color}`}>
              <CircleDot size={11} />
              <span>{statusDot.label}</span>
            </div>
            {/* Session badge */}
            {sessionId && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-terminal-dim border border-terminal-border font-mono text-xs text-terminal-muted">
                <Cpu size={11} />
                <span>session #{sessionId}</span>
              </div>
            )}
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-terminal-muted hover:text-terminal-green transition-colors"
            >
              <ExternalLink size={18} />
            </a>
          </div>
        </div>
      </header>

      {/* ── Main Content ─────────────────────────────────────── */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10 flex flex-col gap-8">

        {/* Hero / tagline (only when idle) */}
        {status === 'idle' && (
          <div className="text-center py-8 animate-fadeIn">
            <p className="font-mono text-terminal-green/70 text-sm tracking-widest uppercase mb-3">
              [ AI Research Automation ]
            </p>
            <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
              Deep Research,{' '}
              <span className="text-terminal-green glow-green">Zero Effort</span>
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto leading-relaxed">
              Enter a topic. Four specialized AI agents search the web, scrape sources,
              write a structured report, and self-review it — all in real-time.
            </p>
          </div>
        )}

        {/* Search Box */}
        <SearchBox onStartResearch={startResearch} isResearching={isResearching} />

        {/* Error banner */}
        {error && (
          <div className="px-4 py-3 rounded-lg border border-terminal-red/40 bg-terminal-red/5 font-mono text-xs text-terminal-red animate-fadeIn">
            ⚠️ {error}
          </div>
        )}

        {/* Agent Terminal — shown when running or has logs */}
        {(isResearching || logs.length > 0) && (
          <AgentTerminal logs={logs} isResearching={isResearching} />
        )}

        {/* Report Viewer */}
        {finalReport && (
          <ReportViewer report={finalReport} />
        )}
      </main>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-terminal-border/30 py-4">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between font-mono text-xs text-terminal-muted/50">
          <span>Agentic Research Grid · Phase 4</span>
          <span>Powered by Groq · LangGraph · Tavily</span>
        </div>
      </footer>
    </div>
  );
}

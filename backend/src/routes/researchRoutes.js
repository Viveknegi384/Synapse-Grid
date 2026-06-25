import { Router } from 'express';
import { query as dbQuery } from '../db/index.js';
import agentEmitter from '../utils/eventEmitter.js';

const router = Router();

function sseWrite(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

// SSE endpoint — frontend connects once and receives live agent updates
router.get('/stream/:sessionId', (req, res) => {
  const sessionId = parseInt(req.params.sessionId, 10);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseWrite(res, {
    type: 'connected',
    message: 'Stream active. Waiting for agent updates…',
    sessionId,
  });

  function onAgentUpdate(payload) {
    if (payload.sessionId !== sessionId) return;
    sseWrite(res, { type: 'agent_update', ...payload });
  }

  function onWorkflowComplete(payload) {
    if (payload.sessionId !== sessionId) return;
    sseWrite(res, { type: 'workflow_complete', sessionId: payload.sessionId });
    res.end();
  }

  function onWorkflowError(payload) {
    if (payload.sessionId !== sessionId) return;
    sseWrite(res, {
      type: 'workflow_error',
      sessionId: payload.sessionId,
      error: payload.error,
    });
    res.end();
  }

  agentEmitter.on('agent_update', onAgentUpdate);
  agentEmitter.on('workflow_complete', onWorkflowComplete);
  agentEmitter.on('workflow_error', onWorkflowError);

  // Remove listeners on disconnect to prevent memory leaks
  req.on('close', () => {
    agentEmitter.removeListener('agent_update', onAgentUpdate);
    agentEmitter.removeListener('workflow_complete', onWorkflowComplete);
    agentEmitter.removeListener('workflow_error', onWorkflowError);
  });
});

// History endpoint — replays past logs and final report on page refresh
router.get('/session/:sessionId', async (req, res) => {
  const { sessionId } = req.params;

  try {
    const [sessionResult, logsResult, reportResult] = await Promise.all([
      dbQuery(`SELECT * FROM research_sessions WHERE id = $1`, [sessionId]),
      dbQuery(
        `SELECT * FROM agent_logs WHERE session_id = $1 ORDER BY created_at ASC`,
        [sessionId]
      ),
      dbQuery(`SELECT * FROM research_reports WHERE session_id = $1`, [sessionId]),
    ]);

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    return res.status(200).json({
      session: sessionResult.rows[0],
      logs: logsResult.rows,
      report: reportResult.rows[0] || null,
    });
  } catch (err) {
    console.error('[researchRoutes] Error fetching session:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;

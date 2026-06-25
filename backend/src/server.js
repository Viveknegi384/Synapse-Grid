import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { query as dbQuery } from './db/index.js';
import { researchGraph } from './agents/graph.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Helper: run the LangGraph pipeline in the background ───────────────────
async function runResearchGraph(sessionId, userQuery) {
  // Mark session as PROCESSING
  await dbQuery(
    `UPDATE research_sessions SET status = 'PROCESSING' WHERE id = $1`,
    [sessionId]
  );

  try {
    const finalState = await researchGraph.invoke({
      sessionId,
      userQuery,
    });

    // Persist the completed report
    await dbQuery(
      `INSERT INTO research_reports (session_id, report_content) VALUES ($1, $2)`,
      [sessionId, finalState.draftReport]
    );

    // Mark session as COMPLETED
    await dbQuery(
      `UPDATE research_sessions SET status = 'COMPLETED' WHERE id = $1`,
      [sessionId]
    );

    console.log(`✅ Research session ${sessionId} completed.`);
  } catch (err) {
    console.error(`❌ Research session ${sessionId} failed:`, err.message);

    // Log the failure to agent_logs
    await dbQuery(
      `INSERT INTO agent_logs (session_id, agent_name, log_message) VALUES ($1, $2, $3)`,
      [sessionId, 'System', `Graph execution failed: ${err.message}`]
    );

    // Mark session as FAILED
    await dbQuery(
      `UPDATE research_sessions SET status = 'FAILED' WHERE id = $1`,
      [sessionId]
    );
  }
}

// ── Routes ──────────────────────────────────────────────────

// GET /api/health — confirm API is live
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// POST /api/research/start — create session & kick off the agent graph
app.post('/api/research/start', async (req, res) => {
  const { query: userQuery } = req.body;

  // Input validation
  if (!userQuery || userQuery.trim() === '') {
    return res.status(400).json({ error: 'Query is required in the request body.' });
  }

  try {
    // 1. Insert a new session row (status defaults to 'PENDING')
    const result = await dbQuery(
      `INSERT INTO research_sessions (user_query, status)
       VALUES ($1, 'PENDING')
       RETURNING *`,
      [userQuery.trim()]
    );

    const session = result.rows[0];

    // 2. Return 201 immediately — the client now has the session_id to poll
    res.status(201).json({ session });

    // 3. Fire-and-forget the graph (runs in the background, does NOT block the response)
    runResearchGraph(session.id, userQuery.trim());
  } catch (err) {
    console.error('Database error creating session:', err.message);
    return res.status(500).json({ error: 'Internal server error. Could not create session.' });
  }
});

// GET /api/research/:id — fetch session status & report (for polling)
app.get('/api/research/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const sessionResult = await dbQuery(
      `SELECT * FROM research_sessions WHERE id = $1`,
      [id]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    const session = sessionResult.rows[0];

    // Also fetch report and logs
    const [reportResult, logsResult] = await Promise.all([
      dbQuery(`SELECT * FROM research_reports WHERE session_id = $1`, [id]),
      dbQuery(
        `SELECT * FROM agent_logs WHERE session_id = $1 ORDER BY created_at ASC`,
        [id]
      ),
    ]);

    return res.status(200).json({
      session,
      report: reportResult.rows[0] || null,
      logs: logsResult.rows,
    });
  } catch (err) {
    console.error('Database error fetching session:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── Start Server ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

export default app;

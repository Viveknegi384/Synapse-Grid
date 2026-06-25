import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { query as dbQuery } from './db/index.js';
import { researchGraph } from './agents/graph.js';
import { emitWorkflowComplete, emitWorkflowError } from './agents/nodes.js';
import researchRoutes from './routes/researchRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Runs the LangGraph pipeline in the background after session is created
async function runResearchGraph(sessionId, userQuery) {
  await dbQuery(
    `UPDATE research_sessions SET status = 'PROCESSING' WHERE id = $1`,
    [sessionId]
  );

  try {
    const finalState = await researchGraph.invoke({ sessionId, userQuery });

    await dbQuery(
      `INSERT INTO research_reports (session_id, report_content) VALUES ($1, $2)`,
      [sessionId, finalState.draftReport]
    );

    await dbQuery(
      `UPDATE research_sessions SET status = 'COMPLETED' WHERE id = $1`,
      [sessionId]
    );

    emitWorkflowComplete(sessionId, finalState.draftReport);
    console.log(`✅ Research session ${sessionId} completed.`);
  } catch (err) {
    console.error(`❌ Research session ${sessionId} failed:`, err.message);

    await dbQuery(
      `INSERT INTO agent_logs (session_id, agent_name, log_message) VALUES ($1, $2, $3)`,
      [sessionId, 'System', `Graph execution failed: ${err.message}`]
    );

    await dbQuery(
      `UPDATE research_sessions SET status = 'FAILED' WHERE id = $1`,
      [sessionId]
    );

    emitWorkflowError(sessionId, err.message);
  }
}

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/research/start', async (req, res) => {
  const { query: userQuery } = req.body;

  if (!userQuery || userQuery.trim() === '') {
    return res.status(400).json({ error: 'Query is required in the request body.' });
  }

  try {
    const result = await dbQuery(
      `INSERT INTO research_sessions (user_query, status)
       VALUES ($1, 'PENDING')
       RETURNING *`,
      [userQuery.trim()]
    );

    const session = result.rows[0];

    res.status(201).json({ session });

    // Fire-and-forget — does NOT block the response
    runResearchGraph(session.id, userQuery.trim());
  } catch (err) {
    console.error('Database error creating session:', err.message);
    return res.status(500).json({ error: 'Internal server error. Could not create session.' });
  }
});

// Mounts SSE stream and session history routes
app.use('/api/research', researchRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

export default app;

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { query } from './db/index.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────

// GET /api/health — confirm API is live
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// POST /api/research/start — create a new research session
app.post('/api/research/start', async (req, res) => {
  const { query: userQuery } = req.body;

  // Input validation
  if (!userQuery || userQuery.trim() === '') {
    return res.status(400).json({ error: 'Query is required in the request body.' });
  }

  try {
    const result = await query(
      `INSERT INTO research_sessions (user_query, status)
       VALUES ($1, 'PENDING')
       RETURNING *`,
      [userQuery.trim()]
    );

    return res.status(201).json({ session: result.rows[0] });
  } catch (err) {
    console.error('Database error creating session:', err.message);
    return res.status(500).json({ error: 'Internal server error. Could not create session.' });
  }
});

// ── Start Server ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

export default app;

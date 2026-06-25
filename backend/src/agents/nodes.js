import { ChatGroq } from '@langchain/groq';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { query as dbQuery } from '../db/index.js';
import { searchWeb, scrapeUrls } from './tools.js';
import agentEmitter from '../utils/eventEmitter.js';

const llm = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: 'llama-3.1-8b-instant',
  temperature: 0,
});

// NOTE: CriticAgent does NOT use withStructuredOutput.
// withStructuredOutput creates an internal LangChain tool whose schema validator
// throws "Expected object, received string" when Groq returns raw text.
// We use plain llm.invoke() + manual JSON parse instead — fully reliable.

// Persists log to DB and broadcasts via SSE in real-time
async function logToDb(sessionId, agentName, message) {
  const timestamp = new Date().toISOString();

  try {
    await dbQuery(
      `INSERT INTO agent_logs (session_id, agent_name, log_message)
       VALUES ($1, $2, $3)`,
      [sessionId, agentName, message]
    );
  } catch (err) {
    console.error(`[DB Log Error] ${agentName}:`, err.message);
  }

  agentEmitter.emit('agent_update', {
    sessionId,
    agentName,
    logMessage: message,
    timestamp,
  });
}

export function emitWorkflowComplete(sessionId, draftReport) {
  agentEmitter.emit('workflow_complete', { sessionId, draftReport });
}

export function emitWorkflowError(sessionId, error) {
  agentEmitter.emit('workflow_error', { sessionId, error });
}

export async function searchAgentNode(state) {
  const { sessionId, userQuery } = state;
  await logToDb(sessionId, 'SearchAgent', `Starting search for: "${userQuery}"`);

  const response = await llm.invoke([
    new SystemMessage(
      'You are an expert research assistant. Given a research topic, output ONLY a concise, optimised search query string (no explanation, no quotes).'
    ),
    new HumanMessage(`Research topic: ${userQuery}`),
  ]);

  const optimisedQuery = response.content.trim();
  await logToDb(sessionId, 'SearchAgent', `Optimised query: "${optimisedQuery}"`);

  const urls = await searchWeb(optimisedQuery);
  await logToDb(
    sessionId,
    'SearchAgent',
    `Found ${urls.length} source(s): ${urls.join(', ')}`
  );

  return { urls };
}

export async function scrapeAgentNode(state) {
  const { sessionId, urls, userQuery } = state;
  await logToDb(sessionId, 'ScrapeAgent', `Scraping ${urls.length} URL(s)…`);

  const rawText = await scrapeUrls(urls);
  await logToDb(
    sessionId,
    'ScrapeAgent',
    `Scraping complete. Extracted ${rawText.length} characters. Summarising…`
  );

  // Summarise to keep context window manageable for the Writer
  const response = await llm.invoke([
    new SystemMessage(
      'You are a research analyst. Summarise the following raw web content into a dense, fact-rich research brief relevant to the given topic. Preserve key data, statistics, names, and dates. Output plain text only.'
    ),
    new HumanMessage(`Topic: ${userQuery}\n\nRaw content:\n${rawText}`),
  ]);

  const scrapedContent = response.content.trim();
  await logToDb(
    sessionId,
    'ScrapeAgent',
    `Summary complete (${scrapedContent.length} chars).`
  );

  return { scrapedContent };
}

export async function writerAgentNode(state) {
  const { sessionId, userQuery, scrapedContent, feedback, revisionCount } = state;

  const isRevision = revisionCount > 0 && feedback;
  await logToDb(
    sessionId,
    'WriterAgent',
    isRevision
      ? `Revising report (revision #${revisionCount + 1}) based on critic feedback…`
      : 'Drafting initial research report…'
  );

  const feedbackSection = isRevision
    ? `\n\nPrevious Critic Feedback (must be addressed):\n${feedback}`
    : '';

  const response = await llm.invoke([
    new SystemMessage(
      `You are an expert research writer. Write a comprehensive, highly-structured Markdown report based on the provided research brief.
Include:
- An executive summary
- Multiple clearly titled sections (##)
- Key findings, statistics, and citations where available
- A conclusion section
Use professional, precise language. Output ONLY valid Markdown — no preamble.`
    ),
    new HumanMessage(
      `Research Topic: ${userQuery}\n\nResearch Brief:\n${scrapedContent}${feedbackSection}`
    ),
  ]);

  const draftReport = response.content.trim();
  await logToDb(
    sessionId,
    'WriterAgent',
    `Report draft complete (${draftReport.length} chars).`
  );

  return {
    draftReport,
    revisionCount: revisionCount + 1,
  };
}

export async function criticAgentNode(state) {
  const { sessionId, draftReport, userQuery, revisionCount } = state;
  await logToDb(sessionId, 'CriticAgent', `Evaluating report (revision count: ${revisionCount})…`);

  // Hard cap to prevent runaway API costs
  if (revisionCount >= 2) {
    await logToDb(sessionId, 'CriticAgent', 'Revision cap reached (2). Forcing PASS.');
    return { status: 'PASS', feedback: '' };
  }

  // Use plain llm.invoke() — no withStructuredOutput, no internal tool schema validation.
  // The LLM is instructed to return raw JSON; we parse + validate it ourselves.
  const response = await llm.invoke([
    new SystemMessage(
      `You are a strict research editor. Evaluate whether the Markdown report answers the research topic.

Criteria for REVISE: missing sections, factual gaps, shallow depth, or poor structure.
Criteria for PASS: comprehensive, well-structured, factually grounded.

Respond ONLY with this exact JSON (no markdown fences, no extra text):
{"status":"PASS","feedback":""}
or
{"status":"REVISE","feedback":"reason here"}`
    ),
    new HumanMessage(`Research Topic: ${userQuery}\n\nReport Draft:\n${draftReport}`),
  ]);

  // Robust manual parse — strip any accidental markdown fences
  let status = 'PASS';
  let feedback = '';
  try {
    const cleaned = response.content
      .trim()
      .replace(/^```[a-z]*\n?/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    const parsed = JSON.parse(cleaned);
    status = ['PASS', 'REVISE'].includes(String(parsed.status).toUpperCase())
      ? String(parsed.status).toUpperCase()
      : 'PASS';
    feedback = parsed.feedback ?? '';
  } catch (err) {
    console.warn('[CriticAgent] JSON parse failed, defaulting to PASS:', err.message);
    status = 'PASS';
    feedback = '';
  }

  await logToDb(
    sessionId,
    'CriticAgent',
    `Verdict: ${status}. ${feedback ? `Feedback: ${feedback.slice(0, 200)}` : ''}`
  );

  return { status, feedback };
}

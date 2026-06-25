import { ChatGroq } from '@langchain/groq';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { query as dbQuery } from '../db/index.js';
import { searchWeb, scrapeUrls } from './tools.js';

// ── Shared LLM (Groq — ultra-low latency) ────────────────────────────────────
const llm = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: 'llama3-8b-8192',
  temperature: 0,
});

// ── Structured output schema for CriticAgent (JSON Schema — Zod-version safe) ─
// Using a plain JSON Schema avoids the Zod v3/v4 mismatch between LangChain
// internals and the locally installed zod package.
const CriticSchema = {
  name: 'critic_output',
  description: 'Structured editorial verdict on the research report',
  parameters: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: ['PASS', 'REVISE'],
        description: "'PASS' if comprehensive, 'REVISE' if gaps exist",
      },
      feedback: {
        type: 'string',
        description: 'Detailed feedback when REVISE, empty string when PASS',
      },
    },
    required: ['status', 'feedback'],
  },
};


// ── Helper: persist agent activity to the DB ──────────────────────────────────
async function logToDb(sessionId, agentName, message) {
  try {
    await dbQuery(
      `INSERT INTO agent_logs (session_id, agent_name, log_message)
       VALUES ($1, $2, $3)`,
      [sessionId, agentName, message]
    );
  } catch (err) {
    // Non-fatal — log to console but don't crash the agent
    console.error(`[DB Log Error] ${agentName}:`, err.message);
  }
}

// ── Agent 1: SearchAgent ──────────────────────────────────────────────────────
/**
 * Uses the LLM to form an optimised search query, then calls Tavily
 * to retrieve the top 5 relevant URLs.
 */
export async function searchAgentNode(state) {
  const { sessionId, userQuery } = state;
  await logToDb(sessionId, 'SearchAgent', `Starting search for: "${userQuery}"`);

  // Ask the LLM to craft a precise, search-engine-friendly query
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

// ── Agent 2: ScrapeAgent ──────────────────────────────────────────────────────
/**
 * Visits each URL returned by the SearchAgent, extracts raw page text,
 * then uses the LLM to summarise it into a compact research brief.
 */
export async function scrapeAgentNode(state) {
  const { sessionId, urls, userQuery } = state;
  await logToDb(sessionId, 'ScrapeAgent', `Scraping ${urls.length} URL(s)…`);

  const rawText = await scrapeUrls(urls);
  await logToDb(
    sessionId,
    'ScrapeAgent',
    `Scraping complete. Extracted ${rawText.length} characters. Summarising…`
  );

  // Summarise to keep the context window manageable for the Writer
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

// ── Agent 3: WriterAgent ──────────────────────────────────────────────────────
/**
 * Drafts a comprehensive, structured Markdown research report using the
 * scraped content. On revision cycles it incorporates the Critic's feedback.
 */
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

// ── Agent 4: CriticAgent ──────────────────────────────────────────────────────
/**
 * Reviews the draft report against the original query.
 * Uses .withStructuredOutput() to guarantee a typed { status, feedback } object —
 * no manual JSON parsing or hallucination cleanup needed.
 * Forces PASS after 2 revisions to prevent runaway API costs.
 */
export async function criticAgentNode(state) {
  const { sessionId, draftReport, userQuery, revisionCount } = state;
  await logToDb(sessionId, 'CriticAgent', `Evaluating report (revision count: ${revisionCount})…`);

  // Hard cap — prevent infinite billing loops
  if (revisionCount >= 2) {
    await logToDb(sessionId, 'CriticAgent', 'Revision cap reached (2). Forcing PASS.');
    return { status: 'PASS', feedback: '' };
  }

  // Lazily create the structured LLM inside the function to avoid top-level
  // binding issues with the ChatGroq class during module initialisation
  const structuredCriticLlm = llm.withStructuredOutput(CriticSchema);

  // structuredCriticLlm.invoke() returns a typed object matching CriticSchema
  const result = await structuredCriticLlm.invoke([
    new SystemMessage(
      `You are a strict research editor. Evaluate whether the provided Markdown report adequately answers the research topic.

Criteria for REVISE: missing key sections, factual gaps, lack of depth, or poor structure.
Criteria for PASS: comprehensive coverage, well-structured, factually grounded.`
    ),
    new HumanMessage(
      `Research Topic: ${userQuery}\n\nReport Draft:\n${draftReport}`
    ),
  ]);

  await logToDb(
    sessionId,
    'CriticAgent',
    `Verdict: ${result.status}. ${result.feedback ? `Feedback: ${result.feedback.slice(0, 200)}` : ''}`
  );

  return { status: result.status, feedback: result.feedback };
}

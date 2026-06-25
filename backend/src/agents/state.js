import { Annotation } from '@langchain/langgraph';

/**
 * GraphState — the single shared state object that flows through
 * every node in the research multi-agent graph.
 */
export const GraphState = Annotation.Root({
  /** Database session ID — links all DB logs to the correct row */
  sessionId: Annotation({
    reducer: (_, next) => next,
    default: () => null,
  }),

  /** The raw research topic submitted by the user */
  userQuery: Annotation({
    reducer: (_, next) => next,
    default: () => '',
  }),

  /** Top URLs discovered by the SearchAgent via Tavily */
  urls: Annotation({
    reducer: (_, next) => next,
    default: () => [],
  }),

  /** Concatenated readable text extracted from all scraped URLs */
  scrapedContent: Annotation({
    reducer: (_, next) => next,
    default: () => '',
  }),

  /** The Markdown research report produced by the WriterAgent */
  draftReport: Annotation({
    reducer: (_, next) => next,
    default: () => '',
  }),

  /** Detailed editorial feedback from the CriticAgent (used on REVISE) */
  feedback: Annotation({
    reducer: (_, next) => next,
    default: () => '',
  }),

  /** Number of times the Writer→Critic loop has executed (caps at 2) */
  revisionCount: Annotation({
    reducer: (_, next) => next,
    default: () => 0,
  }),

  /** CriticAgent verdict: 'PASS' sends to __end__, 'REVISE' loops back */
  status: Annotation({
    reducer: (_, next) => next,
    default: () => 'REVISE',
  }),
});

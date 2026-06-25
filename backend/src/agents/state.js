import { Annotation } from '@langchain/langgraph';

// Shared state object that flows through every node in the research graph
export const GraphState = Annotation.Root({
  sessionId: Annotation({
    reducer: (_, next) => next,
    default: () => null,
  }),

  userQuery: Annotation({
    reducer: (_, next) => next,
    default: () => '',
  }),

  urls: Annotation({
    reducer: (_, next) => next,
    default: () => [],
  }),

  scrapedContent: Annotation({
    reducer: (_, next) => next,
    default: () => '',
  }),

  draftReport: Annotation({
    reducer: (_, next) => next,
    default: () => '',
  }),

  feedback: Annotation({
    reducer: (_, next) => next,
    default: () => '',
  }),

  revisionCount: Annotation({
    reducer: (_, next) => next,
    default: () => 0,
  }),

  // 'PASS' ends the graph, 'REVISE' loops back to WriterAgent
  status: Annotation({
    reducer: (_, next) => next,
    default: () => 'REVISE',
  }),
});

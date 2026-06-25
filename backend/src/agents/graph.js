import { StateGraph, END, START } from '@langchain/langgraph';
import { GraphState } from './state.js';
import {
  searchAgentNode,
  scrapeAgentNode,
  writerAgentNode,
  criticAgentNode,
} from './nodes.js';

// ── Router: decides where to go after the CriticAgent ────────────────────────
function routeAfterCritic(state) {
  return state.status === 'REVISE' ? 'WriterAgent' : END;
}

// ── Build the StateGraph ──────────────────────────────────────────────────────
const workflow = new StateGraph(GraphState)
  // Register nodes
  .addNode('SearchAgent', searchAgentNode)
  .addNode('ScrapeAgent', scrapeAgentNode)
  .addNode('WriterAgent', writerAgentNode)
  .addNode('CriticAgent', criticAgentNode)

  // Linear edges
  .addEdge(START, 'SearchAgent')
  .addEdge('SearchAgent', 'ScrapeAgent')
  .addEdge('ScrapeAgent', 'WriterAgent')
  .addEdge('WriterAgent', 'CriticAgent')

  // Conditional edge: REVISE → WriterAgent, PASS → __end__
  .addConditionalEdges('CriticAgent', routeAfterCritic, {
    WriterAgent: 'WriterAgent',
    [END]: END,
  });

// Compile and export — this is what the server imports and invokes
export const researchGraph = workflow.compile();

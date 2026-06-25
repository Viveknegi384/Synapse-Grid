import { StateGraph, END, START } from '@langchain/langgraph';
import { GraphState } from './state.js';
import {
  searchAgentNode,
  scrapeAgentNode,
  writerAgentNode,
  criticAgentNode,
} from './nodes.js';

function routeAfterCritic(state) {
  return state.status === 'REVISE' ? 'WriterAgent' : END;
}

const workflow = new StateGraph(GraphState)
  .addNode('SearchAgent', searchAgentNode)
  .addNode('ScrapeAgent', scrapeAgentNode)
  .addNode('WriterAgent', writerAgentNode)
  .addNode('CriticAgent', criticAgentNode)
  .addEdge(START, 'SearchAgent')
  .addEdge('SearchAgent', 'ScrapeAgent')
  .addEdge('ScrapeAgent', 'WriterAgent')
  .addEdge('WriterAgent', 'CriticAgent')
  .addConditionalEdges('CriticAgent', routeAfterCritic, {
    WriterAgent: 'WriterAgent',
    [END]: END,
  });

export const researchGraph = workflow.compile();

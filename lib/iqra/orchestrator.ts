/**
 * IQRA Orchestration Layer — التنسيق
 * 
 * Powered by LangChain and LangGraph.
 * Manages the flow between the Brain, Memory, and Tools.
 */

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import { ChatGroq } from "@langchain/groq";
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
import { IQRA_SOUL } from "./brain";
import { IQRAMemory } from "./memory";

// ═══════════════════════════════════
// MODELS
// ═══════════════════════════════════

const models = {
  gemini: new ChatGoogleGenerativeAI({
    modelName: "gemini-1.5-pro",
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  }),
  claude: new ChatAnthropic({
    modelName: "claude-3-opus-20240229",
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  }),
  gpt4o: new ChatOpenAI({
    modelName: "gpt-4o",
    openAIApiKey: process.env.OPENAI_API_KEY,
  }),
  groq: new ChatGroq({
    modelName: "llama-3.3-70b-versatile",
    apiKey: process.env.GROQ_API_KEY,
  }),
};

// ═══════════════════════════════════
// STATE GRAPH
// ═══════════════════════════════════

/**
 * The IQRA Reasoning Node
 */
async function callModel(state: typeof MessagesAnnotation.State) {
  const model = models.groq; // Default to fast for now
  
  // Inject System Prompt if not present
  const messages = [
    { role: "system", content: IQRA_SOUL },
    ...state.messages
  ];
  
  const response = await model.invoke(messages);
  return { messages: [response] };
}

// Create the graph
const workflow = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addEdge("__start__", "agent")
  .addEdge("agent", "__end__");

export const iqraGraph = workflow.compile();

/**
 * Execute a sovereign orchestration loop
 */
export async function iqraExecute(input: string) {
  const initialState = {
    messages: [{ role: "user", content: input }],
  };
  
  const finalState = await iqraGraph.invoke(initialState);
  return finalState.messages[finalState.messages.length - 1].content;
}

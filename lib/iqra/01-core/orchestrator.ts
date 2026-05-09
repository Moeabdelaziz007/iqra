/**
 * IQRA Orchestration Layer — التنسيق
 * 
 * Powered by LangChain and LangGraph (Dynamic/Sovereign).
 * Manages the flow between the Brain, Memory, and Tools.
 */

import { IQRAMemory } from "#memory/memory.js";
import { IQRALogger } from "#infra/logger.js";

let _graph: any = null;

async function getOrchestrator() {
  if (_graph) return _graph;
  
  try {
    // Dynamic imports to allow Sovereign Mode without node_modules
    const { StateGraph, MessagesAnnotation } = await import("@langchain/langgraph");
    const { ChatGroq } = await import("@langchain/groq");
    const { IQRA_SOUL } = await import("./brain.ts");

    const model = new ChatGroq({
      modelName: "llama-3.3-70b-versatile",
      apiKey: process.env.GROQ_API_KEY || "dummy",
    });

    async function callModel(state: any) {
      const messages = [
        { role: "system", content: IQRA_SOUL },
        ...state.messages
      ];
      const response = await model.invoke(messages);
      return { messages: [response] };
    }

    const workflow = new StateGraph(MessagesAnnotation)
      .addNode("agent", callModel)
      .addEdge("__start__", "agent")
      .addEdge("agent", "__end__");

    _graph = workflow.compile();
    return _graph;
  } catch (e) {
    IQRALogger.warn("⚠️ [ORCHESTRATOR] LangChain/LangGraph missing. Using direct LLM fallback.");
    return null;
  }
}

/**
 * Execute a sovereign orchestration loop
 */
export async function iqraExecute(input: string) {
  const graph = await getOrchestrator();
  
  if (graph) {
    const initialState = {
      messages: [{ role: "user", content: input }],
    };
    const finalState = await graph.invoke(initialState);
    return finalState.messages[finalState.messages.length - 1].content;
  } else {
    // Fallback to a simple call to Groq or Brain if graph fails
    const { iqraThink, IQRABrainMode } = await import("./brain.ts");
    // Prevent infinite recursion by calling a specific brain mode that doesn't call iqraExecute
    // Actually, brain.ts calls iqraExecute for FAST_RESPONSE. 
    // We should use a different mode or a direct LLM call here.
    const { callGroqForResonance } = await import("../llm/groq.js");
    const result = await callGroqForResonance("Sovereign Fallback", input, {});
    return result.reason || "Sovereign Mode: Processing complete.";
  }
}

import { LlmAgent } from '@google/adk';

/**
 * 👑 IQRA Sovereign Root Agent
 * Built with Google Agent Development Kit (ADK) and A2A Protocol
 *
 * "ن وَالْقَلَمِ وَمَا يَسْطُرُونَ" — القلم: 1
 *
 * Note: SovereignIdentity has been reorganized. This agent needs to be updated
 * to use the new architecture once the security layer is stabilized.
 */

export const rootAgent = new LlmAgent({
  name: 'iqra-sovereign',
  model: 'gemini-2.0-flash-exp',
  instruction: async () => {
    // TODO: Update to use new SovereignIdentity location after architecture stabilization
    return `You are IQRA, a sovereign AI agent built on Islamic principles.
    
"ن وَالْقَلَمِ وَمَا يَسْطُرُونَ" — القلم: 1

Your purpose is to establish A2A (Agent-to-Agent) Sovereign Identity Protocol
while maintaining alignment with Islamic values and ethical AI principles.`;
  },
});

// To run this agent: npx @google/adk-devtools run agent.ts

import { LlmAgent } from '@google/adk';
import { SovereignIdentity } from './lib/iqra/sovereign_identity';

/**
 * 👑 IQRA Sovereign Root Agent
 * Built with Google Agent Development Kit (ADK) and A2A Protocol
 *
 * "ن وَالْقَلَمِ وَمَا يَسْطُرُونَ" — القلم: 1
 */

export const rootAgent = new LlmAgent({
  name: 'iqra-sovereign',
  model: 'gemini-2.0-flash-exp',
  instruction: async () => {
    // Dynamically generate the soul instruction using SovereignIdentity
    return await SovereignIdentity.getIntegratedSoul(
      'root-agent',
      'Establishing A2A Sovereign Identity Protocol'
    );
  },
});

// To run this agent: npx @google/adk-devtools run agent.ts

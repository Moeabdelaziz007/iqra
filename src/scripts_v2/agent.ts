import { LlmAgent } from '@google/adk';
import { SovereignIdentity } from '#security/sovereign_identity';

/**
 * 👑 IQRA Sovereign Root Agent
 * Built with Google Agent Development Kit (ADK) and A2A Protocol
 *
 * "ن وَالْقَلَمِ وَمَا يَسْطُرُونَ" — القلم: 1
 *
 * [CONSTITUTIONAL_COMPLIANCE]
 * This agent follows IQRA_SUPREME.md and iqra-core/DASTŪR.md
 * - No mock data (Rule 1)
 * - Integrated soul from SovereignIdentity (restored from ccdef00)
 * - Follows 369 cycle and 7-layer architecture
 */

export const rootAgent = new LlmAgent({
  name: 'iqra-sovereign',
  model: 'gemini-2.0-flash-exp',
  instruction: async () => {
    // Dynamically generate the soul instruction using SovereignIdentity
    // This follows IQRA_SUPREME.md requirement for real data, no mocks
    return await SovereignIdentity.getIntegratedSoul(
      'root-agent',
      'Establishing A2A Sovereign Identity Protocol'
    );
  },
});

// To run this agent: npx @google/adk-devtools run agent.ts

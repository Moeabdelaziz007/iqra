import { BaseConnector } from './base';
import { GoogleConnector } from './google';
import { GroqConnector } from './groq';
import { SovereignConnector } from '../../lib/iqra/04-quran/sovereign_connector'; // [TC] reason: relative path to canonical lib/iqra | id: c1-conn

export type Provider = 'google' | 'groq' | 'sovereign';

export class ConnectorFactory {
    static getConnector(provider?: Provider): BaseConnector {
        const target = provider || (process.env.DEFAULT_PROVIDER as Provider) || 'google';

        switch (target) {
            case 'google': return new GoogleConnector();
            case 'groq': return new GroqConnector();
            case 'sovereign': return new SovereignConnector();
            default: return new GoogleConnector();
        }
    }

    /**
     * Finds the first available connector with a valid API key.
     */
    static getFirstAvailable(): BaseConnector {
        if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) return new GoogleConnector();
        if (process.env.GROQ_API_KEY) return new GroqConnector();
        
        throw new Error('No valid LLM API keys found (Google or Groq). Sovereignty requires real resonance.');
    }

    /**
     * 🛡️ Returns a ResilientConnector that handles multi-provider failover.
     */
    static getResilientConnector(): BaseConnector {
        return new ResilientConnector();
    }
}

/**
 * 🌀 ResilientConnector | الموصل المرن
 * Handles the failover chain: Google -> Groq -> (Economy)
 */
class ResilientConnector extends BaseConnector {
    name = 'Resilient (Sovereign)';
    private chain: BaseConnector[] = [];

    constructor() {
        super();
        // Initialize the failover chain based on availability
        if (process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY) {
            this.chain.push(new GoogleConnector());
        }
        if (process.env.GROQ_API_KEY) {
            this.chain.push(new GroqConnector());
        }
    }

    async generate(prompt: string, context: { role: 'user' | 'assistant' | 'system'; content: string }[] = []): Promise<ConnectorResponse> {
        if (this.chain.length === 0) {
            throw new Error('No valid providers in failover chain. Check environment variables.');
        }

        let lastError: any;
        for (const connector of this.chain) {
            try {
                return await connector.generate(prompt, context);
            } catch (error: any) {
                lastError = error;
                console.warn(`🚨 [Sovereign Failover] ${connector.name} failed. Shifting topological axis to next available provider...`);
            }
        }

        throw lastError;
    }
}

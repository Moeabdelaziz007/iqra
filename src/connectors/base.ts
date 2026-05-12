import { SovereignError, SovereignErrorCode } from '#errors/sovereign_error';

export interface ConnectorResponse {
    content: string;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
    };
    model: string;
}

export abstract class BaseConnector {
    abstract name: string;
    
    abstract generate(prompt: string, context?: { role: 'user' | 'assistant' | 'system'; content: string }[]): Promise<ConnectorResponse>;

    protected handleFailure(error: any, context: string): never {
        throw new SovereignError(
            SovereignErrorCode.CONNECTION_FAILURE,
            {
                reason: `Connection to ${this.name} failed: ${error.message}`,
                diagnostics: {
                    severity: 'HIGH',
                    source: context,
                    recovery_strategy: 'REFLECT'
                }
            }
        );
    }

    protected async verifyTruth(content: string) {
        // Placeholder for Truth Oracle cross-referencing
        // "And do not mix the truth with falsehood" (2:42)
        if (content.includes('mock') || content.includes('fake result')) {
             throw new SovereignError(
                SovereignErrorCode.HALLUCINATION_DETECTED,
                {
                    reason: 'Hallucination or Mock data detected in output.',
                    diagnostics: {
                        severity: 'CRITICAL',
                        source: this.name,
                        recovery_strategy: 'HALT'
                    }
                }
            );
        }
    }
}

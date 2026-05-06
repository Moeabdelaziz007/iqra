import { describe, it, expect, vi } from 'vitest';
import { iqraGraph } from '../../lib/iqra/orchestrator';

// Mock the models to avoid network calls
vi.mock('@langchain/groq', () => {
  return {
    ChatGroq: vi.fn().mockImplementation(() => ({
      invoke: vi.fn().mockResolvedValue({
        content: 'Mocked response from Groq',
        additional_kwargs: {},
        response_metadata: {},
      }),
    })),
  };
});

vi.mock('@langchain/google-genai', () => ({
  ChatGoogleGenerativeAI: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('@langchain/anthropic', () => ({
  ChatAnthropic: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn().mockImplementation(() => ({})),
}));

// Mock IQRA_SOUL and other internal imports
vi.mock('../../lib/iqra/brain', () => ({
  IQRA_SOUL: 'Mocked Soul Content',
}));

vi.mock('../../lib/iqra/memory', () => ({
  IQRAMemory: {},
}));

describe('iqraGraph', () => {
  it('should be defined', () => {
    expect(iqraGraph).toBeDefined();
  });

  it('should process a message through the agent node', async () => {
    const input = 'Hello IQRA';
    const initialState = {
      messages: [{ role: 'user', content: input }],
    };

    // We invoke the graph
    const result = await iqraGraph.invoke(initialState);

    // Assertions
    expect(result.messages).toBeDefined();
    expect(result.messages.length).toBe(2); // Initial user message + Agent response

    const lastMessage = result.messages[result.messages.length - 1];
    expect(lastMessage.content).toBe('Mocked response from Groq');
  });
});

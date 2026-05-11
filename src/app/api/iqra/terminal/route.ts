import { NextRequest, NextResponse } from 'next/server';
import { AgentCore, IQRAPulse } from '../../../../../lib/iqra/core';
import { IQRABrainMode } from '../../../../../lib/iqra/brain';
import { IQRACommands } from '../../../../../lib/iqra/commands';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { query, mode = IQRABrainMode.FAST_RESPONSE } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const sendPulse = (pulse: IQRAPulse) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(pulse)}\n\n`));
        };

        // Handle Commands
        if (query.startsWith('/')) {
          const cmd = query.split(' ')[0];
          let responseText = '';

          sendPulse({ type: 'BASMALAH', status: 'IN_PROGRESS', message: 'Executing command...' });

          switch (cmd) {
            case '/status': responseText = IQRACommands.getStatus(); break;
            case '/sleep': responseText = IQRACommands.sleep(); break;
            case '/wake': responseText = IQRACommands.wake(); break;
            case '/reflect': responseText = IQRACommands.reflect(); break;
            case '/help':
              responseText = "Available commands:\n/status - System health\n/sleep - Sleep mode\n/wake - Wake up\n/reflect - Latest insights\n/help - Show this message";
              break;
            default: responseText = "Unknown command. Try /help.";
          }

          sendPulse({ type: 'COMPLETED', status: 'SUCCESS', message: 'Command executed.', data: { response: responseText } });
          controller.close();
          return;
        }

        // Handle Natural Language with AgentCore (Sacred Hooks + LLM)
        try {
          await AgentCore.execute(query, mode, (p) => {
            sendPulse(p);
          });
        } catch (error: any) {
          console.error("Terminal Stream Error:", error);
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('❌ IQRA Terminal API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

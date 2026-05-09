import { NextResponse } from 'next/server';

function resolveBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, '')}`;

  return 'http://localhost:3000';
}

export async function GET() {
  const baseUrl = resolveBaseUrl();

  return NextResponse.json(
    {
      name: 'iqra-sovereign',
      version: '1.0.0',
      protocol: 'axiom-a2a-v1',
      description: 'IQRA Sovereign Agent Card',
      discovery: `${baseUrl}/.well-known/agent-card.json`,
      did: `${baseUrl}/.well-known/did.json`,
      methods: ['SYNC_QUERY', 'ASYNC_TADABBUR', 'HEARTBEAT_SYNC'],
      endpoints: {
        query: `${baseUrl}/api/iqra/query`,
        simulation: `${baseUrl}/api/iqra/simulation`,
        webhook_telegram: `${baseUrl}/api/webhook/telegram`,
      },
      capabilities: {
        memory: true,
        topology_reward: true,
        trustchain_logging: true,
        no_mock_policy: true,
      },
      timestamp: new Date().toISOString(),
    },
    { status: 200 },
  );
}

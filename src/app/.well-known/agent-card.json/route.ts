import { NextRequest, NextResponse } from 'next/server';
import { resolveBaseUrl } from '../../_utils/http';

export async function GET(req: NextRequest) {
  const baseUrl = resolveBaseUrl(req);

  return NextResponse.json({
    name: 'iqra-sovereign',
    version: '1.0.0',
    protocol: 'axiom-a2a-v1',
    description: 'IQRA Sovereign Agent Card',
    discovery: `${baseUrl}/.well-known/agent-card.json`,
    did: `${baseUrl}/.well-known/did.json`,
    methods: ['SYNC_QUERY', 'ASYNC_TADABBUR', 'HEARTBEAT_SYNC'],
    endpoints: {
      query: `${baseUrl}/api/iqra/query`,
      topology_hidden: `${baseUrl}/api/iqra/topology/hidden`,
    },
    capabilities: {
      memory: true,
      topology_reward: true,
      trustchain_logging: true,
      no_mock_policy: true,
      self_play_trading_data: true,
    },
    timestamp: new Date().toISOString(),
  });
}

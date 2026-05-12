import { NextRequest, NextResponse } from 'next/server';
import { SovereignDID } from '#security/did';

function resolveDomain(req: NextRequest): string {
  const explicit = process.env.NEXT_PUBLIC_APP_DOMAIN?.trim();
  if (explicit) return explicit.replace(/^https?:\/\//, '');

  return req.headers.get('host') || 'localhost:3000';
}

export async function GET(req: NextRequest) {
  try {
    const doc = await SovereignDID.generateDocument('core', resolveDomain(req));
    return NextResponse.json(doc);
  } catch (error: any) {
    return NextResponse.json(
      { error: `Failed to generate DID document: ${error?.message || 'unknown error'}` },
      { status: 500 },
    );
  }
}

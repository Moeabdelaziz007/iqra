import { NextRequest, NextResponse } from 'next/server';
import { SovereignDID } from '#security/did';
import { resolveDomain } from '../../_utils/http';

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

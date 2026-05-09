import { NextResponse } from 'next/server';
import { SovereignDID } from '../../../../lib/iqra/06-security/did';

function resolveDomain(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_DOMAIN?.trim();
  if (explicit) return explicit.replace(/^https?:\/\//, '');

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return vercel.replace(/^https?:\/\//, '');

  return 'localhost:3000';
}

export async function GET() {
  try {
    const doc = await SovereignDID.generateDocument('core', resolveDomain());
    return NextResponse.json(doc, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Failed to generate DID document: ${error?.message || 'unknown error'}` },
      { status: 500 },
    );
  }
}

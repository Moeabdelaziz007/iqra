import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * 🌀 IQRA | Sovereign Simulation API
 * 
 * WHY: To expose the results of AlphaResonance v3 to the dashboard.
 */
export async function GET() {
  try {
    const trainingPath = path.join(process.cwd(), '.iqra', 'resonance_training_data.jsonl');
    const trustChainPath = path.join(process.cwd(), '.iqra', 'trust_chain.jsonl');

    let trainingData: any[] = [];
    if (fs.existsSync(trainingPath)) {
      const content = fs.readFileSync(trainingPath, 'utf8');
      trainingData = content.trim().split('\n').map(line => JSON.parse(line)).slice(-100);
    }

    let trustChain: any[] = [];
    if (fs.existsSync(trustChainPath)) {
      const content = fs.readFileSync(trustChainPath, 'utf8');
      trustChain = content.trim().split('\n').map(line => JSON.parse(line)).slice(-50);
    }

    // Calculate aggregate stats
    const avgResonance = trustChain.length > 0 
      ? trustChain.reduce((acc, curr) => acc + curr.resonance, 0) / trustChain.length 
      : 0;

    return NextResponse.json({
      success: true,
      stats: {
        totalStates: trainingData.length,
        verifiedTruths: trustChain.length,
        avgResonance: avgResonance.toFixed(4),
        lastUpdated: new Date().toISOString()
      },
      trustChain,
      recentSimulations: trainingData.slice(-10)
    });
  } catch (error) {
    console.error("Simulation API Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch simulation data" }, { status: 500 });
  }
}

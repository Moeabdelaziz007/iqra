
import { CodebaseTopologyMapper } from './lib/iqra/topology/codebase_mapper.ts';
import fs from 'fs';

async function main() {
  console.log("🌀 Starting Codebase Topology Scan...");
  const topology = await CodebaseTopologyMapper.scan();
  
  // Convert Map and Set to objects for JSON stringification
  const report = {
    nodes: Object.fromEntries(topology.nodes),
    edges: Array.from(topology.edges),
    h0: topology.h0,
    h1: topology.h1,
    resonance: topology.resonance,
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync('topology_report.json', JSON.stringify(report, null, 2));
  console.log("✅ Topology report saved to topology_report.json");
}

main().catch(console.error);

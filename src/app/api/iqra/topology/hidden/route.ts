import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const NodeSchema = z.object({
  id: z.string().min(1),
  layerId: z.string().min(1),
});

const EdgeSchema = z.object({
  source: z.string().min(1),
  target: z.string().min(1),
  weight: z.number().optional(),
});

const LayerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  visible: z.boolean().optional().default(true),
  opacity: z.number().min(0).max(1).optional().default(1),
});

const RequestSchema = z.object({
  layers: z.array(LayerSchema).min(1),
  nodes: z.array(NodeSchema).min(1),
  edges: z.array(EdgeSchema).min(1),
  exportFormat: z.enum(['json', 'csv', 'graphml']).optional().default('json'),
  minHiddenDegree: z.number().int().min(1).max(50).optional().default(2),
});

function toCsv(
  hiddenLayerIds: string[],
  hiddenPatterns: Array<{ type: string; nodeId: string; degree: number; layerId: string }>,
) {
  const rows = [
    'kind,type,nodeId,degree,layerId,hiddenLayerId',
    ...hiddenPatterns.map((p) => `pattern,${p.type},${p.nodeId},${p.degree},${p.layerId},`),
    ...hiddenLayerIds.map((layerId) => `hidden_layer,,,,,${layerId}`),
  ];
  return rows.join('\n');
}

function toGraphML(
  data: z.infer<typeof RequestSchema>,
  hiddenLayerIds: Set<string>,
  hiddenNodeIds: Set<string>,
) {
  const nodesXml = data.nodes
    .map(
      (n) =>
        `<node id="${n.id}"><data key="layer">${n.layerId}</data><data key="hidden">${
          hiddenNodeIds.has(n.id) ? 'true' : 'false'
        }</data></node>`,
    )
    .join('');

  const edgesXml = data.edges
    .map(
      (e, idx) =>
        `<edge id="e${idx}" source="${e.source}" target="${e.target}"><data key="hidden">${
          hiddenNodeIds.has(e.source) || hiddenNodeIds.has(e.target) ? 'true' : 'false'
        }</data></edge>`,
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <graph id="hidden-topology" edgedefault="undirected">
    ${nodesXml}
    ${edgesXml}
    <data key="hidden_layers">${Array.from(hiddenLayerIds).join(',')}</data>
  </graph>
</graphml>`;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body || {});

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid topology payload', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const data = parsed.data;
    const hiddenLayerIds = new Set(
      data.layers
        .filter((layer) => layer.visible === false || layer.opacity < 0.1)
        .map((layer) => layer.id),
    );

    const hiddenNodeIds = new Set(
      data.nodes.filter((node) => hiddenLayerIds.has(node.layerId)).map((node) => node.id),
    );

    const degreeMap = new Map<string, number>();
    for (const node of data.nodes) degreeMap.set(node.id, 0);

    const extractedConnections = data.edges.filter(
      (edge) => hiddenNodeIds.has(edge.source) || hiddenNodeIds.has(edge.target),
    );
    for (const edge of extractedConnections) {
      degreeMap.set(edge.source, (degreeMap.get(edge.source) || 0) + 1);
      degreeMap.set(edge.target, (degreeMap.get(edge.target) || 0) + 1);
    }

    const hiddenPatterns = data.nodes
      .filter((node) => hiddenNodeIds.has(node.id))
      .map((node) => ({
        type: (degreeMap.get(node.id) || 0) >= data.minHiddenDegree ? 'hidden_hub' : 'hidden_node',
        nodeId: node.id,
        degree: degreeMap.get(node.id) || 0,
        layerId: node.layerId,
      }))
      .sort((a, b) => b.degree - a.degree);

    const payload = {
      timestamp: new Date().toISOString(),
      hiddenLayerIds: Array.from(hiddenLayerIds),
      hiddenPatterns,
      extractedConnections,
      stats: {
        totalLayers: data.layers.length,
        hiddenLayers: hiddenLayerIds.size,
        hiddenNodes: hiddenNodeIds.size,
        extractedConnections: extractedConnections.length,
      },
    };

    const outDir = path.join(process.cwd(), 'iqra-core', 'data');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.appendFileSync(
      path.join(outDir, 'topology_hidden_patterns.jsonl'),
      `${JSON.stringify(payload)}\n`,
      'utf-8',
    );

    if (data.exportFormat === 'csv') {
      return new NextResponse(toCsv(payload.hiddenLayerIds, payload.hiddenPatterns), {
        headers: { 'Content-Type': 'text/csv; charset=utf-8' },
      });
    }

    if (data.exportFormat === 'graphml') {
      return new NextResponse(toGraphML(data, hiddenLayerIds, hiddenNodeIds), {
        headers: { 'Content-Type': 'application/graphml+xml; charset=utf-8' },
      });
    }

    return NextResponse.json(payload);
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Failed to parse or analyze hidden topology layers',
        details: error?.message || 'unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

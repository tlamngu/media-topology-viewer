import dagre from 'dagre';
import { Node, Edge, Position } from 'reactflow';
import { Entity, ParsedTopology } from '../types';

const NODE_WIDTH = 300;
const NODE_HEIGHT_BASE = 80;
const PAD_HEIGHT = 24;

export const getLayoutedElements = (parsedData: ParsedTopology, direction: 'LR' | 'TB' = 'LR') => {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: direction, nodesep: 50, ranksep: 150 });
  g.setDefaultEdgeLabel(() => ({}));

  const rfNodes: Node[] = [];
  const rfEdges: Edge[] = [];

  // 1. Create Nodes
  parsedData.entities.forEach((entity) => {
    const height = NODE_HEIGHT_BASE + (entity.pads.length * PAD_HEIGHT);
    g.setNode(entity.id, { width: NODE_WIDTH, height: height });

    rfNodes.push({
      id: entity.id,
      type: 'entityNode',
      data: { entity },
      position: { x: 0, y: 0 },
    });
  });

  // 2. Create Edges
  parsedData.rawLinks.forEach((link) => {
    // Ensure both nodes exist before creating edge
    if (g.hasNode(link.sourceEntityId) && g.hasNode(link.targetEntityId)) {
        g.setEdge(link.sourceEntityId, link.targetEntityId);

        const isEnabled = link.flags.includes('ENABLED');
        const isImmutable = link.flags.includes('IMMUTABLE');

        rfEdges.push({
            id: `e-${link.sourceEntityId}-${link.sourcePadIndex}-${link.targetEntityId}-${link.targetPadIndex}`,
            source: link.sourceEntityId,
            target: link.targetEntityId,
            sourceHandle: `p${link.sourcePadIndex}`,
            targetHandle: `p${link.targetPadIndex}`,
            animated: isEnabled,
            style: { 
                stroke: isEnabled ? '#10b981' : '#374151',
                strokeWidth: isEnabled ? 2 : 1.5,
                strokeDasharray: isImmutable ? '5 5' : 'none',
                cursor: isImmutable ? 'not-allowed' : 'pointer',
            },
            data: { isImmutable, isEnabled }, // Pass data for click handling
            label: isEnabled ? 'Active' : undefined,
            labelStyle: { fill: '#10b981', fontWeight: 700, fontSize: 10 },
        });
    }
  });

  // 3. Calculate Layout
  dagre.layout(g);

  // 4. Apply Positions
  const layoutedNodes = rfNodes.map((node) => {
    const nodeWithPosition = g.node(node.id);
    return {
      ...node,
      targetPosition: Position.Left,
      sourcePosition: Position.Right,
      position: {
        x: nodeWithPosition.x - (NODE_WIDTH / 2),
        y: nodeWithPosition.y - (nodeWithPosition.height / 2),
      },
    };
  });

  return { nodes: layoutedNodes, edges: rfEdges };
};
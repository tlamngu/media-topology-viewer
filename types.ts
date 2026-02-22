export interface Pad {
  index: number;
  type: 'Sink' | 'Source';
  formats: string[];
  links: LinkInfo[];
  id: string; // Unique ID for ReactFlow handle (e.g., entityId-padIndex)
}

export interface LinkInfo {
  remoteEntityName: string;
  remotePadIndex: number;
  flags: string[];
  isIncoming: boolean;
}

export interface Entity {
  id: string;
  name: string;
  type: string;
  subtype: string;
  flags: string;
  deviceNode?: string;
  pads: Pad[];
}

export interface ParsedTopology {
  entities: Entity[];
  rawLinks: Array<{
    sourceEntityId: string;
    sourcePadIndex: number;
    targetEntityName: string;
    targetEntityId: string;
    targetPadIndex: number;
    flags: string[];
  }>;
}

export enum ViewMode {
  Input = 'INPUT',
  Graph = 'GRAPH',
}

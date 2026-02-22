import { Entity, Pad, ParsedTopology } from '../types';

export const parseMediaCtlOutput = (text: string): ParsedTopology => {
  const lines = text.split('\n');
  const entities: Entity[] = [];
  let currentEntity: Entity | null = null;
  let currentPad: Pad | null = null;

  // Regex definitions
  const entityRegex = /^- entity (\d+): (.+) \((\d+) pads, (\d+) links/;
  const typeRegex = /^\s+type (.+) subtype (.+) flags (.*)/;
  const nodeNameRegex = /^\s+device node name (.+)/;
  const padRegex = /^\s+pad(\d+): (Sink|Source)/;
  const linkRegex = /^\s+(->|<-) "([^"]+)":(\d+) \[(.*)\]/;
  const formatRegex = /^\s+\[(.+)\]/;

  for (const line of lines) {
    // 1. Detect Entity
    const entityMatch = line.match(entityRegex);
    if (entityMatch) {
      if (currentEntity) {
        entities.push(currentEntity);
      }
      currentEntity = {
        id: entityMatch[1],
        name: entityMatch[2],
        type: 'Unknown',
        subtype: 'Unknown',
        flags: '0',
        pads: [],
      };
      currentPad = null;
      continue;
    }

    if (!currentEntity) continue;

    // 2. Entity Details
    const typeMatch = line.match(typeRegex);
    if (typeMatch) {
      currentEntity.type = typeMatch[1];
      currentEntity.subtype = typeMatch[2];
      currentEntity.flags = typeMatch[3];
      continue;
    }

    const nodeMatch = line.match(nodeNameRegex);
    if (nodeMatch) {
      currentEntity.deviceNode = nodeMatch[1];
      continue;
    }

    // 3. Detect Pad
    const padMatch = line.match(padRegex);
    if (padMatch) {
      currentPad = {
        index: parseInt(padMatch[1], 10),
        type: padMatch[2] as 'Sink' | 'Source',
        formats: [],
        links: [],
        id: `e${currentEntity.id}-p${padMatch[1]}`,
      };
      currentEntity.pads.push(currentPad);
      continue;
    }

    if (!currentPad) continue;

    // 4. Pad Details (Format)
    const formatMatch = line.match(formatRegex);
    if (formatMatch) {
      currentPad.formats.push(formatMatch[1]);
      continue;
    }

    // 5. Links
    const linkMatch = line.match(linkRegex);
    if (linkMatch) {
      const direction = linkMatch[1];
      const remoteName = linkMatch[2];
      const remotePad = parseInt(linkMatch[3], 10);
      const flags = linkMatch[4].split(',').filter(f => f).map(f => f.trim());

      currentPad.links.push({
        remoteEntityName: remoteName,
        remotePadIndex: remotePad,
        flags,
        isIncoming: direction === '<-',
      });
    }
  }

  // Push the last entity
  if (currentEntity) {
    entities.push(currentEntity);
  }

  // Construct rawLinks with targetEntityId
  const rawLinks: ParsedTopology['rawLinks'] = [];
  
  entities.forEach(entity => {
    entity.pads.forEach(pad => {
        pad.links.forEach(link => {
            // We only map outgoing links from the source perspective
            if (!link.isIncoming) {
                const targetEntity = findEntityByName(entities, link.remoteEntityName);
                if (targetEntity) {
                    rawLinks.push({
                        sourceEntityId: entity.id,
                        sourcePadIndex: pad.index,
                        targetEntityName: link.remoteEntityName,
                        targetEntityId: targetEntity.id,
                        targetPadIndex: link.remotePadIndex,
                        flags: link.flags
                    });
                }
            }
        });
    });
  });

  return { entities, rawLinks };
};

export const findEntityByName = (entities: Entity[], name: string): Entity | undefined => {
    return entities.find(e => e.name === name);
};
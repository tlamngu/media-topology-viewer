import { ParsedTopology, Entity } from '../types';
import { findEntityByName } from './parser';

const getEntityNameById = (entities: Entity[], id: string): string => {
    const entity = entities.find(e => e.id === id);
    return entity ? entity.name : id;
};

export const generateMediaCtlCommands = (
    initial: ParsedTopology | null,
    current: ParsedTopology
): string[] => {
    if (!initial) return [];

    const commands: string[] = [];
    const processedLinks = new Set<string>();

    current.rawLinks.forEach(currentLink => {
        const linkKey = `${currentLink.sourceEntityId}:${currentLink.sourcePadIndex}->${currentLink.targetEntityId}:${currentLink.targetPadIndex}`;
        processedLinks.add(linkKey);

        const initialLink = initial.rawLinks.find(l => 
            l.sourceEntityId === currentLink.sourceEntityId &&
            l.sourcePadIndex === currentLink.sourcePadIndex &&
            l.targetEntityId === currentLink.targetEntityId &&
            l.targetPadIndex === currentLink.targetPadIndex
        );

        const currentEnabled = currentLink.flags.includes('ENABLED');
        // If link didn't exist before, or state changed
        const initialEnabled = initialLink ? initialLink.flags.includes('ENABLED') : false;

        if (currentEnabled !== initialEnabled) {
             const sourceName = getEntityNameById(current.entities, currentLink.sourceEntityId);
             const targetName = getEntityNameById(current.entities, currentLink.targetEntityId);
             
             // Format: media-ctl -l '"entity":pad -> "entity":pad [1|0]'
             const state = currentEnabled ? '1' : '0';
             commands.push(`media-ctl -l '"${sourceName}":${currentLink.sourcePadIndex} -> "${targetName}":${currentLink.targetPadIndex} [${state}]'`);
        }
    });

    return commands;
};

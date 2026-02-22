import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Entity, Pad } from '../types';
import { Camera, Cpu, Video, Settings2 } from 'lucide-react';

interface EntityNodeProps {
  data: {
    entity: Entity;
  };
}

const getIcon = (type: string, subtype: string) => {
  if (subtype === 'Sensor') return <Camera className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />;
  if (type.includes('V4L') && subtype === 'Unknown') return <Cpu className="w-4 h-4 text-blue-500 dark:text-blue-400" />;
  if (type === 'Node' && subtype === 'V4L') return <Video className="w-4 h-4 text-green-500 dark:text-green-400" />;
  return <Settings2 className="w-4 h-4 text-gray-400" />;
};

const EntityNode = memo(({ data }: EntityNodeProps) => {
  const { entity } = data;

  const sinkPads = entity.pads.filter((p) => p.type === 'Sink');
  const sourcePads = entity.pads.filter((p) => p.type === 'Source');

  return (
    <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg shadow-xl min-w-[280px] overflow-hidden hover:border-blue-500 transition-colors">
      {/* Header */}
      <div className="bg-gray-50 dark:bg-gray-900 p-2 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
            {getIcon(entity.type, entity.subtype)}
            <div>
                <div className="text-sm font-bold text-gray-900 dark:text-white leading-none">{entity.name}</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono mt-0.5">ID: {entity.id}</div>
            </div>
        </div>
        {entity.deviceNode && (
            <div className="text-[10px] bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300 font-mono">
                {entity.deviceNode.split('/').pop()}
            </div>
        )}
      </div>

      {/* Body */}
      <div className="p-2 space-y-2">
        {entity.pads.map((pad) => (
            <div key={pad.index} className="relative flex items-center justify-between group h-6">
                
                {/* Sink Handle (Left) */}
                {pad.type === 'Sink' && (
                    <div className="flex items-center absolute left-[-8px]">
                        <Handle
                            type="target"
                            position={Position.Left}
                            id={`p${pad.index}`}
                            className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white dark:!border-gray-800"
                        />
                         <span className="text-[10px] text-gray-500 dark:text-gray-400 ml-4 font-mono">pad{pad.index}</span>
                    </div>
                )}

                {/* Content Spacer */}
                <div className="flex-1"></div>

                {/* Source Handle (Right) */}
                {pad.type === 'Source' && (
                    <div className="flex items-center absolute right-[-8px]">
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 mr-4 font-mono">pad{pad.index}</span>
                        <Handle
                            type="source"
                            position={Position.Right}
                            id={`p${pad.index}`}
                            className="!w-3 !h-3 !bg-green-500 !border-2 !border-white dark:!border-gray-800"
                        />
                    </div>
                )}
            </div>
        ))}
        {entity.pads.length === 0 && (
            <div className="text-[10px] text-gray-500 dark:text-gray-600 text-center italic p-1">No pads</div>
        )}
      </div>
      
      {/* Footer Info */}
      <div className="bg-gray-50/50 dark:bg-gray-900/50 p-1.5 border-t border-gray-200 dark:border-gray-800 flex justify-between">
         <span className="text-[10px] text-gray-500">{entity.subtype}</span>
      </div>
    </div>
  );
});

export default EntityNode;

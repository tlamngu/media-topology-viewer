import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  useNodesState, 
  useEdgesState, 
  ConnectionLineType,
  Panel,
  Edge,
  Connection,
  ReactFlowInstance
} from 'reactflow';
// CSS imported in index.html
import { ParsedTopology, Entity } from '../types';
import { getLayoutedElements } from '../utils/layout';
import EntityNode from './EntityNode';
import { Info, X, EyeOff, Eye, Search, Command, LayoutTemplate, ArrowRight, ArrowDown } from 'lucide-react';

interface VisualizerProps {
  data: ParsedTopology;
  onLinkToggle: (sourceId: string, sourcePad: number, targetId: string, targetPad: number) => void;
  onConnect: (connection: Connection) => void;
  hideInactive: boolean;
  theme: 'light' | 'dark';
}

const nodeTypes = {
  entityNode: EntityNode,
};

const Visualizer: React.FC<VisualizerProps> = ({ data, onLinkToggle, onConnect, hideInactive, theme }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  
  // React Flow Instance for viewport manipulation
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);

  // Search State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Layout State
  const [layoutDirection, setLayoutDirection] = useState<'LR' | 'TB'>('LR');

  // Filter links before layout if hideInactive is active
  const filteredTopology = useMemo(() => {
    if (!hideInactive) return data;
    return {
        ...data,
        rawLinks: data.rawLinks.filter(link => link.flags.includes('ENABLED'))
    };
  }, [data, hideInactive]);

  // Handle Layout
  const applyLayout = useCallback(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(filteredTopology, layoutDirection);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    
    // Fit view after a short delay to allow render
    setTimeout(() => {
        rfInstance?.fitView({ duration: 800 });
    }, 10);
  }, [filteredTopology, layoutDirection, setNodes, setEdges, rfInstance]);

  // Initial Layout Effect
  useEffect(() => {
    applyLayout();
  }, [applyLayout]);

  // Keyboard Shortcuts (Ctrl+K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsSearchOpen((open) => !open);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Focus input when search opens
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
        // Small timeout to ensure render
        setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
        setSearchQuery('');
    }
  }, [isSearchOpen]);

  const onNodeClick = useCallback((event: React.MouseEvent, node: any) => {
    setSelectedEntity(node.data.entity);
  }, []);

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    if (edge.data?.isImmutable) return;
    const sourcePadIndex = parseInt(edge.sourceHandle?.replace('p', '') || '0', 10);
    const targetPadIndex = parseInt(edge.targetHandle?.replace('p', '') || '0', 10);
    onLinkToggle(edge.source, sourcePadIndex, edge.target, targetPadIndex);
  }, [onLinkToggle]);

  const closeSidebar = () => setSelectedEntity(null);

  // Search Logic
  const filteredEntities = useMemo(() => {
    if (!searchQuery) return [];
    return data.entities.filter(e => 
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        e.id.includes(searchQuery) ||
        e.type.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 10); // Limit results
  }, [data.entities, searchQuery]);

  const handleSearchSelect = (entity: Entity) => {
    setIsSearchOpen(false);
    setSelectedEntity(entity);
    
    // Zoom to node
    if (rfInstance) {
        const node = nodes.find(n => n.id === entity.id);
        if (node) {
            rfInstance.setCenter(
                node.position.x + 150, // Center based on node width (300/2)
                node.position.y + 40,  // Approx center height
                { zoom: 1.2, duration: 1000 }
            );
        }
    }
  };

  const toggleDirection = () => {
    setLayoutDirection(prev => prev === 'LR' ? 'TB' : 'LR');
  };

  return (
    <div className="w-full h-full flex relative group">
      <div className="flex-1 h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onInit={setRfInstance}
          connectionLineType={ConnectionLineType.SmoothStep}
          fitView
          minZoom={0.1}
          className="bg-gray-50 dark:bg-gray-950"
        >
          <Background color={theme === 'dark' ? "#374151" : "#e5e7eb"} gap={20} />
          <Controls className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 fill-gray-900 dark:fill-white" />
          
          <Panel position="top-right" className="flex flex-col gap-2 items-end">
             {/* Info Panel */}
             <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg text-xs text-gray-600 dark:text-gray-300 min-w-[140px]">
                <div className="flex justify-between"><span>Entities:</span> <span className="text-gray-900 dark:text-white font-mono">{data.entities.length}</span></div>
                <div className="flex justify-between"><span>Links:</span> <span className="text-gray-900 dark:text-white font-mono">{filteredTopology.rawLinks.length}</span></div>
                {hideInactive && <div className="text-yellow-600 dark:text-yellow-400 mt-1 flex items-center gap-1 justify-end pt-1 border-t border-gray-200 dark:border-gray-700"><EyeOff className="w-3 h-3"/> Hidden</div>}
             </div>

             {/* Smart Arrangement Controls */}
             <div className="flex gap-2">
                 <button
                    onClick={toggleDirection}
                    className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg text-gray-600 dark:text-gray-300 transition-colors flex items-center gap-2"
                    title={`Current Layout: ${layoutDirection === 'LR' ? 'Horizontal' : 'Vertical'}`}
                 >
                    {layoutDirection === 'LR' ? <ArrowRight className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                 </button>
                 <button
                    onClick={applyLayout}
                    className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg text-gray-600 dark:text-gray-300 transition-colors flex items-center gap-2 text-xs font-medium"
                    title="Re-run Smart Arrangement"
                 >
                    <LayoutTemplate className="w-4 h-4" />
                    <span>Arrange</span>
                 </button>
             </div>
          </Panel>
          
          {/* Search Hint (Visible when not searching) */}
          <Panel position="bottom-center" className="mb-6 opacity-50 hover:opacity-100 transition-opacity">
            <button 
                onClick={() => setIsSearchOpen(true)}
                className="bg-white/80 dark:bg-gray-900/80 backdrop-blur border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 px-4 py-2 rounded-full text-xs flex items-center gap-3 shadow-xl hover:text-gray-900 dark:hover:text-white hover:border-gray-400 dark:hover:border-gray-500 transition-all"
            >
                <Search className="w-3 h-3" />
                <span>Quick Find</span>
                <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-[10px] font-mono border border-gray-200 dark:border-gray-700">
                    <Command className="w-3 h-3" />
                    <span>K</span>
                </div>
            </button>
          </Panel>
        </ReactFlow>
      </div>

      {/* Search Modal */}
      {isSearchOpen && (
        <div className="absolute inset-0 z-50 bg-white/50 dark:bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[15vh]" onClick={() => setIsSearchOpen(false)}>
            <div 
                className="w-full max-w-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3">
                    <Search className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <input 
                        ref={searchInputRef}
                        type="text" 
                        className="bg-transparent border-none outline-none flex-1 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 text-lg"
                        placeholder="Search entities..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    <button onClick={() => setIsSearchOpen(false)} className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">ESC</button>
                </div>
                
                <div className="max-h-[60vh] overflow-y-auto">
                    {searchQuery ? (
                        filteredEntities.length > 0 ? (
                            <div className="p-2">
                                <div className="text-xs text-gray-500 px-2 py-1 uppercase tracking-wider font-semibold">Results</div>
                                {filteredEntities.map(entity => (
                                    <button
                                        key={entity.id}
                                        onClick={() => handleSearchSelect(entity)}
                                        className="w-full text-left px-3 py-3 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-500/30 border border-transparent flex items-center justify-between group transition-all"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-gray-500 dark:text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400">
                                                {/* Simple Icon Mapping */}
                                                {entity.subtype === 'Sensor' ? <Eye className="w-4 h-4"/> : <LayoutTemplate className="w-4 h-4"/>}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-gray-900 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-white">
                                                    {entity.name}
                                                </div>
                                                <div className="text-xs text-gray-500 flex gap-2">
                                                    <span>ID: {entity.id}</span>
                                                    <span>•</span>
                                                    <span>{entity.type}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-gray-400 dark:text-gray-600 group-hover:text-blue-500 dark:group-hover:text-blue-400 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-gray-500">
                                No entities found for "{searchQuery}"
                            </div>
                        )
                    ) : (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-600 text-sm">
                            Type to find nodes...
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* Details Sidebar */}
      {selectedEntity && (
        <div className="absolute top-4 right-4 bottom-4 w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-4 overflow-y-auto z-20 flex flex-col">
            <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Info className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                    Details
                </h2>
                <button onClick={closeSidebar} className="text-gray-400 hover:text-gray-900 dark:hover:text-white">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="space-y-4 text-sm">
                <div>
                    <label className="text-gray-500 text-xs uppercase tracking-wider">Entity</label>
                    <div className="font-mono text-gray-900 dark:text-white text-lg">{selectedEntity.name}</div>
                    <div className="text-gray-500 dark:text-gray-400">ID: {selectedEntity.id}</div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                        <label className="text-gray-500 text-xs">Type</label>
                        <div className="text-gray-900 dark:text-white">{selectedEntity.type}</div>
                    </div>
                     <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                        <label className="text-gray-500 text-xs">Subtype</label>
                        <div className="text-gray-900 dark:text-white">{selectedEntity.subtype}</div>
                    </div>
                </div>

                {selectedEntity.deviceNode && (
                    <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
                        <label className="text-gray-500 text-xs">Device Node</label>
                        <div className="text-green-600 dark:text-green-400 font-mono">{selectedEntity.deviceNode}</div>
                    </div>
                )}

                <div>
                    <label className="text-gray-500 text-xs uppercase tracking-wider block mb-2">Pads Configuration</label>
                    <div className="space-y-3">
                        {selectedEntity.pads.map(pad => (
                            <div key={pad.index} className="bg-gray-50/50 dark:bg-gray-800/50 p-3 rounded border border-gray-200/50 dark:border-gray-700/50">
                                <div className="flex justify-between mb-1">
                                    <span className={`font-bold ${pad.type === 'Sink' ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'}`}>
                                        Pad {pad.index} ({pad.type})
                                    </span>
                                </div>
                                
                                {pad.formats.length > 0 && (
                                    <div className="mb-2">
                                        <div className="text-xs text-gray-500 mb-0.5">Format:</div>
                                        {pad.formats.map((fmt, i) => (
                                            <div key={i} className="font-mono text-[10px] text-gray-600 dark:text-gray-300 break-all bg-gray-200/50 dark:bg-black/30 p-1 rounded">
                                                {fmt}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {pad.links.length > 0 && (
                                    <div>
                                         <div className="text-xs text-gray-500 mb-0.5">Links:</div>
                                         <ul className="space-y-1">
                                            {pad.links.map((link, i) => (
                                                <li key={i} className="text-[10px] flex items-center gap-1">
                                                    <span className="text-gray-400">{link.isIncoming ? '<-' : '->'}</span>
                                                    <span className="text-gray-900 dark:text-white font-semibold">{link.remoteEntityName}:{link.remotePadIndex}</span>
                                                    {link.flags.length > 0 && (
                                                        <span className="text-xs text-yellow-600 dark:text-yellow-500">[{link.flags.join(',')}]</span>
                                                    )}
                                                </li>
                                            ))}
                                         </ul>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Visualizer;
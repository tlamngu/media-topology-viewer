import React, { useState } from 'react';
import { Connection } from 'reactflow';
import { EXAMPLE_LOG } from './constants';
import { parseMediaCtlOutput } from './utils/parser';
import { generateMediaCtlCommands } from './utils/commandGenerator';
import { ViewMode, ParsedTopology } from './types';
import Visualizer from './components/Visualizer';
import { 
  Network, 
  Play, 
  AlertCircle, 
  ArrowLeft,
  Eye,
  EyeOff,
  Terminal,
  Copy,
  Check,
  Sun,
  Moon
} from 'lucide-react';

export default function App() {
  const [rawText, setRawText] = useState('');
  
  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'light' || savedTheme === 'dark') {
        return savedTheme;
      }
      // Check system preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }
    return 'dark';
  });

  // Apply theme class and save preference
  React.useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  // State for Topology
  const [initialTopology, setInitialTopology] = useState<ParsedTopology | null>(null);
  const [currentTopology, setCurrentTopology] = useState<ParsedTopology | null>(null);
  
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Input);
  const [error, setError] = useState<string | null>(null);
  
  // View Options
  const [hideInactive, setHideInactive] = useState(false);
  
  // Script Modal
  const [showScript, setShowScript] = useState(false);
  const [generatedScript, setGeneratedScript] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const handleVisualize = () => {
    if (!rawText.trim()) {
      setError("Please enter some media-ctl output first.");
      return;
    }
    try {
      const data = parseMediaCtlOutput(rawText);
      if (data.entities.length === 0) {
        setError("No entities found. Please check your input format.");
        return;
      }
      // Deep copy for initial state to allow comparison later
      setInitialTopology(JSON.parse(JSON.stringify(data)));
      setCurrentTopology(data);
      setViewMode(ViewMode.Graph);
      setError(null);
    } catch (e) {
      setError("Failed to parse input.");
      console.error(e);
    }
  };

  const handleLinkToggle = (sourceId: string, sourcePad: number, targetId: string, targetPad: number) => {
      if (!currentTopology) return;

      const newTopology = { ...currentTopology };
      const linkIndex = newTopology.rawLinks.findIndex(l => 
          l.sourceEntityId === sourceId &&
          l.sourcePadIndex === sourcePad &&
          l.targetEntityId === targetId &&
          l.targetPadIndex === targetPad
      );

      if (linkIndex !== -1) {
          const link = newTopology.rawLinks[linkIndex];
          // Check for immutable
          if (link.flags.includes('IMMUTABLE')) return;

          const newFlags = link.flags.includes('ENABLED')
              ? link.flags.filter(f => f !== 'ENABLED')
              : [...link.flags, 'ENABLED'];
          
          const newLink = { ...link, flags: newFlags };
          const newLinks = [...newTopology.rawLinks];
          newLinks[linkIndex] = newLink;
          
          setCurrentTopology({ ...newTopology, rawLinks: newLinks });
      }
  };

  const handleConnect = (connection: Connection) => {
    if (!currentTopology || !connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) return;

    const sourceId = connection.source;
    const targetId = connection.target;
    
    // Handles are "p0", "p1" etc.
    const sourcePad = parseInt(connection.sourceHandle.replace('p', ''), 10);
    const targetPad = parseInt(connection.targetHandle.replace('p', ''), 10);

    // Find if link already exists
    const linkIndex = currentTopology.rawLinks.findIndex(l => 
        l.sourceEntityId === sourceId &&
        l.sourcePadIndex === sourcePad &&
        l.targetEntityId === targetId &&
        l.targetPadIndex === targetPad
    );

    if (linkIndex !== -1) {
        // Link exists: if it's disabled, enable it. 
        // If it's enabled, we do nothing (duplicate connection attempt usually means "ensure connected")
        const link = currentTopology.rawLinks[linkIndex];
        if (!link.flags.includes('ENABLED')) {
            handleLinkToggle(sourceId, sourcePad, targetId, targetPad);
        }
    } else {
        // New Link
        const targetEntity = currentTopology.entities.find(e => e.id === targetId);
        if (!targetEntity) return;

        const newLink = {
            sourceEntityId: sourceId,
            sourcePadIndex: sourcePad,
            targetEntityName: targetEntity.name,
            targetEntityId: targetId,
            targetPadIndex: targetPad,
            flags: ['ENABLED']
        };

        const newTopology = {
            ...currentTopology,
            rawLinks: [...currentTopology.rawLinks, newLink]
        };
        setCurrentTopology(newTopology);
    }
  };

  const handleGenerateScript = () => {
      if (!currentTopology) return;
      const commands = generateMediaCtlCommands(initialTopology, currentTopology);
      setGeneratedScript(commands);
      setShowScript(true);
  };

  const copyToClipboard = () => {
      navigator.clipboard.writeText(generatedScript.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const loadExample = () => {
    setRawText(EXAMPLE_LOG);
    setError(null);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      {/* Header */}
      <header className="h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between px-6 shrink-0 z-30 transition-colors duration-200">
        <div className="flex items-center gap-2">
          <Network className="w-6 h-6 text-blue-600 dark:text-blue-500" />
          <h1 className="font-bold text-lg tracking-wide hidden md:block text-gray-900 dark:text-white">MediaCtl <span className="text-blue-600 dark:text-blue-500">Visualizer</span></h1>
        </div>
        
        <div className="flex items-center gap-4">
        {viewMode === ViewMode.Graph && (
            <div className="flex items-center gap-2 md:gap-4">
                 {/* Filters */}
                 <button
                    onClick={() => setHideInactive(!hideInactive)}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors border ${hideInactive ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-200' : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}
                    title="Toggle inactive connections"
                 >
                    {hideInactive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    <span className="hidden md:inline">{hideInactive ? 'Hidden Inactive' : 'Show All'}</span>
                 </button>

                 <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>

                 {/* Actions */}
                 <button 
                  onClick={handleGenerateScript}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors border border-gray-200 dark:border-gray-700 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:border-green-300 dark:hover:border-green-800"
                >
                  <Terminal className="w-4 h-4" />
                  <span className="hidden md:inline">Gen Script</span>
                </button>
                
                <button 
                  onClick={() => setViewMode(ViewMode.Input)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors border border-gray-200 dark:border-gray-700 ml-2 text-gray-700 dark:text-gray-300"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden md:inline">Edit</span>
                </button>
            </div>
        )}
        
        {/* Theme Toggle */}
        <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden relative">
        {viewMode === ViewMode.Input ? (
          <div className="h-full max-w-5xl mx-auto p-6 flex flex-col gap-4">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-2xl font-semibold mb-1 text-gray-900 dark:text-white">Topology Input</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Paste your <code>media-ctl -p -d /dev/mediaX</code> output below.</p>
              </div>
              <button 
                onClick={loadExample}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 underline underline-offset-4"
              >
                Load Example Data
              </button>
            </div>

            <div className="flex-1 relative">
                <textarea
                  className="w-full h-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 font-mono text-sm leading-relaxed resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none shadow-inner text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600"
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Media controller API version 6.17.1..."
                  spellCheck={false}
                />
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-200 p-3 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            <button
              onClick={handleVisualize}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-lg shadow-lg shadow-blue-900/20 text-white transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5 fill-current" />
              Visualize Topology
            </button>
          </div>
        ) : (
          <div className="h-full relative">
            {currentTopology && (
                <Visualizer 
                    data={currentTopology} 
                    onLinkToggle={handleLinkToggle} 
                    onConnect={handleConnect}
                    hideInactive={hideInactive}
                    theme={theme}
                />
            )}
            
            {/* Script Generation Modal */}
            {showScript && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Terminal className="w-5 h-5 text-green-600 dark:text-green-500" />
                                Generated Configuration Commands
                            </h3>
                            <button onClick={() => setShowScript(false)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-0 overflow-hidden flex-1 relative bg-gray-50 dark:bg-black">
                            <div className="absolute top-4 right-4 z-10">
                                <button 
                                    onClick={copyToClipboard}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded text-xs text-gray-600 dark:text-gray-300 transition-all shadow-sm"
                                >
                                    {copied ? <Check className="w-3 h-3 text-green-500 dark:text-green-400" /> : <Copy className="w-3 h-3" />}
                                    {copied ? 'Copied' : 'Copy'}
                                </button>
                            </div>
                            <pre className="p-6 text-sm font-mono text-green-700 dark:text-green-400 overflow-auto h-full scrollbar-thin">
                                {generatedScript.length > 0 ? (
                                    generatedScript.join('\n')
                                ) : (
                                    <span className="text-gray-500 italic"># No changes detected from original topology. Toggle links to generate commands.</span>
                                )}
                            </pre>
                        </div>
                        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 text-xs text-gray-500">
                            These commands apply the changes made in the visualizer relative to the original log.
                        </div>
                    </div>
                </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function X(props: React.SVGProps<SVGSVGElement>) {
    return <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
}
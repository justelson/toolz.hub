import { useState, useRef, useEffect } from 'react';
import { LayoutGrid, List, RefreshCw, Search } from 'lucide-react';
import MCPCard from './MCPCard';
import MCPTable from './MCPTable';
import DetailView from './DetailView';
import SourceFilter from './SourceFilter';
import type { MCPServer, MCPAnalysis, MCPServerInfo } from '../../shared/types';

interface DashboardProps {
  servers: MCPServer[];
  analyses: Map<string, MCPAnalysis>;
  introspections: Map<string, MCPServerInfo>;
  analyzingServers: Set<string>;
  scanning: boolean;
  onAnalyze: (server: MCPServer, forceReanalyze?: boolean) => void;
  onScan: () => void;
  onLoadFromCache?: () => void;
  hasCachedData?: boolean;
}

export default function Dashboard({ servers, analyses, introspections, analyzingServers, scanning, onAnalyze, onScan, onLoadFromCache, hasCachedData }: DashboardProps) {
  const [selectedServer, setSelectedServer] = useState<MCPServer | null>(null);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [leftWidth, setLeftWidth] = useState(280); // Increased from 224
  const [rightWidth, setRightWidth] = useState(350); // Decreased from 400
  
  const leftResizing = useRef(false);
  const rightResizing = useRef(false);

  // Handle left sidebar resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (leftResizing.current) {
        const newWidth = Math.max(180, Math.min(400, e.clientX));
        setLeftWidth(newWidth);
      }
      if (rightResizing.current) {
        const newWidth = Math.max(300, Math.min(600, window.innerWidth - e.clientX));
        setRightWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      leftResizing.current = false;
      rightResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleLeftResizeStart = () => {
    leftResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleRightResizeStart = () => {
    rightResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  // Get unique sources
  const sources = Array.from(new Set(servers.map(s => s.source || 'Unknown').filter(Boolean)));
  
  // Count servers per source
  const serverCounts = servers.reduce((acc, server) => {
    const source = server.source || 'Unknown';
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Filter servers by selected source
  const filteredServers = selectedSource
    ? servers.filter(s => s.source === selectedSource)
    : servers;

  if (servers.length === 0) {
    return (
      <>
        {/* Left Sidebar - Source Filter */}
        <aside 
          className="bg-card border-r-2 border-border overflow-y-auto p-4"
          style={{ width: `${leftWidth}px` }}
        >
          <div className="flex items-center gap-2 mb-4 pb-4 border-b-2 border-border">
            <div className="w-2 h-2 bg-primary" />
            <h3 className="font-bold font-mono text-sm">SOURCES</h3>
          </div>
          <p className="text-xs text-muted-foreground font-mono">No sources available</p>
        </aside>

        {/* Resize Handle - Left */}
        <div
          className="w-1 bg-border hover:bg-primary cursor-col-resize transition-colors relative group"
          onMouseDown={handleLeftResizeStart}
        >
          <div className="absolute inset-y-0 -left-1 -right-1" />
        </div>

        {/* Main Area */}
        <div className="flex-1 flex items-center justify-center bg-background">
          <div className="text-center p-8">
            <div className="w-20 h-20 mx-auto mb-6 bg-primary/10 border-2 border-primary flex items-center justify-center">
              <Search size={40} className="text-primary" />
            </div>
            <h2 className="text-2xl font-bold font-serif mb-2">NO MCP SERVERS DETECTED</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Start by scanning your system to detect MCP servers from Kiro, Claude Desktop, Cline, and other sources.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={onScan}
                disabled={scanning}
                className="px-6 py-3 bg-primary text-primary-foreground font-mono text-sm font-bold border-2 border-primary hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} className={scanning ? 'animate-spin' : ''} />
                {scanning ? 'SCANNING...' : 'SCAN FOR MCP SERVERS'}
              </button>
              
              {hasCachedData && onLoadFromCache && (
                <button
                  onClick={onLoadFromCache}
                  className="px-6 py-3 bg-secondary text-secondary-foreground font-mono text-sm font-bold border-2 border-border hover:bg-secondary/80 transition-all flex items-center justify-center gap-2"
                >
                  <Search size={16} />
                  LOAD FROM LAST SCAN
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Detail Pane */}
        <aside 
          className="bg-card border-l-2 border-border"
          style={{ width: `${rightWidth}px` }}
        />
      </>
    );
  }

  return (
    <>
      {/* Left Sidebar - Source Filter */}
      <aside 
        className="bg-card/50 border-r border-border overflow-y-auto p-3 flex flex-col gap-2"
        style={{ width: `${leftWidth}px` }}
      >
        <div className="flex items-center gap-2 px-2 py-2 mb-2">
           <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sources</span>
        </div>
        
        <SourceFilter
          sources={sources}
          selectedSource={selectedSource}
          onSelectSource={setSelectedSource}
          serverCounts={serverCounts}
        />
      </aside>

      {/* Resize Handle - Left */}
      <div
        className="w-1 bg-border hover:bg-primary cursor-col-resize transition-colors relative group"
        onMouseDown={handleLeftResizeStart}
      >
        <div className="absolute inset-y-0 -left-1 -right-1" />
      </div>

      {/* Center - Server List */}
      <div className="flex-1 flex flex-col bg-background min-w-0">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-background flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm bg-background/80">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              {selectedSource ? selectedSource : 'All Servers'}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
               {filteredServers.length} {filteredServers.length === 1 ? 'server' : 'servers'} detected
            </p>
          </div>
          
          <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border border-border/50">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'grid'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Grid View"
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'table'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Table View"
            >
              <List size={14} />
            </button>
          </div>
        </div>

        {/* Server List */}
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          {filteredServers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                 <List size={24} className="text-muted-foreground/50" />
              </div>
              <h3 className="text-sm font-medium text-foreground">No servers found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                {selectedSource ? `No servers found in ${selectedSource}` : 'Try scanning for MCP servers'}
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredServers.map((server) => (
                <MCPCard
                  key={server.id}
                  server={server}
                  analysis={analyses.get(server.id)}
                  loading={analyzingServers.has(server.id)}
                  onAnalyze={() => onAnalyze(server)}
                  onSelect={() => setSelectedServer(server)}
                  isSelected={selectedServer?.id === server.id}
                />
              ))}
            </div>
          ) : (
            <div className="bg-card rounded-lg border border-border overflow-hidden">
               <MCPTable
                  servers={filteredServers}
                  analyses={analyses}
                  analyzingServers={analyzingServers}
                  onAnalyze={onAnalyze}
                  onSelect={setSelectedServer}
                  selectedServerId={selectedServer?.id}
                />
            </div>
          )}
        </div>
      </div>

      {/* Resize Handle - Right */}
      {selectedServer && (
        <div
          className="w-1 bg-border hover:bg-primary cursor-col-resize transition-colors relative group"
          onMouseDown={handleRightResizeStart}
        >
          <div className="absolute inset-y-0 -left-1 -right-1" />
        </div>
      )}

      {/* Right Sidebar - Detail View */}
      {selectedServer ? (
          <aside 
            className="bg-card border-l border-border overflow-y-auto shadow-xl z-20"
            style={{ width: `${rightWidth}px` }}
          >
            <DetailView
              server={selectedServer}
              analysis={analyses.get(selectedServer.id)}
              introspection={introspections.get(selectedServer.id)}
              onReanalyze={(server) => onAnalyze(server, true)}
              isAnalyzing={analyzingServers.has(selectedServer.id)}
            />
          </aside>
      ) : (
          <aside 
            className="bg-card/30 border-l border-border flex items-center justify-center p-8 text-center"
            style={{ width: `${rightWidth}px` }}
          >
             <div className="text-muted-foreground/50 text-sm">Select a server to view details</div>
          </aside>
      )}
    </>
  );
}

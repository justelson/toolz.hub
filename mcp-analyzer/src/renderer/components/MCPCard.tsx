import { Zap, ZapOff, HelpCircle, Clock, Package, Terminal, Activity, Brain } from 'lucide-react';
import type { MCPServer, MCPAnalysis } from '../../shared/types';

interface MCPCardProps {
  server: MCPServer;
  analysis?: MCPAnalysis;
  loading: boolean;
  onAnalyze: () => void;
  onSelect: () => void;
  isSelected: boolean;
}

export default function MCPCard({
  server,
  analysis,
  loading,
  onAnalyze,
  onSelect,
  isSelected,
}: MCPCardProps) {
  const isPlaceholder = server.id.startsWith('placeholder-');
  
  const statusConfig = {
    running: { icon: Zap, color: 'text-green-500', bg: 'bg-green-500/10', borderColor: 'border-green-500/20', label: 'Running' },
    stopped: { icon: ZapOff, color: 'text-muted-foreground', bg: 'bg-muted', borderColor: 'border-border', label: 'Stopped' },
    unknown: { icon: HelpCircle, color: 'text-yellow-500', bg: 'bg-yellow-500/10', borderColor: 'border-yellow-500/20', label: 'Unknown' },
    stale: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-500/10', borderColor: 'border-yellow-500/20', label: 'Stale' },
  };

  const status = statusConfig[server.status];
  const StatusIcon = status.icon;

  // Placeholder card for IDEs with no servers
  if (isPlaceholder) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 flex flex-col items-center justify-center text-center h-full min-h-[200px]">
        <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center mb-3">
          <Package size={24} className="text-muted-foreground/50" />
        </div>
        <h3 className="font-semibold text-sm text-foreground mb-1">{server.source}</h3>
        <p className="text-xs text-muted-foreground">No MCP servers configured</p>
      </div>
    );
  }

  return (
    <div
      onClick={onSelect}
      className={`
        group relative rounded-lg border transition-all duration-200 cursor-pointer overflow-hidden flex flex-col h-full
        ${isSelected 
          ? 'bg-card border-primary shadow-[0_0_0_1px_rgba(var(--primary),1)]' 
          : 'bg-card border-border hover:border-primary/50 hover:shadow-sm'
        }
      `}
    >
      <div className="p-4 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-md flex items-center justify-center transition-colors ${isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground group-hover:text-primary group-hover:bg-primary/5'}`}>
              <Package size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground leading-tight mb-0.5">{server.name}</h3>
              <p className="text-xs text-muted-foreground truncate max-w-[150px]">{server.source || 'Unknown Source'}</p>
            </div>
          </div>
          
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${status.bg} ${status.borderColor}`}>
            <StatusIcon size={10} className={status.color} />
            <span className={`text-[10px] font-medium ${status.color}`}>
              {status.label}
            </span>
          </div>
        </div>

        {/* Command info - simplified */}
        <div className="mb-4 mt-auto">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
             <Terminal size={12} />
             <span className="opacity-70">Command</span>
          </div>
          <code className="block text-[11px] bg-muted/50 text-foreground px-2 py-1 rounded border border-border/50 truncate font-mono">
            {server.command} {server.args.join(' ')}
          </code>
        </div>

        {/* Analysis Preview or Action */}
        <div className="pt-3 border-t border-border mt-auto">
           {analysis ? (
             <div className="space-y-2">
               <div className="flex items-center justify-between text-xs">
                 <div className="flex items-center gap-1.5 text-foreground font-medium">
                   <Activity size={12} className="text-primary" />
                   <span>Analysis Ready</span>
                 </div>
                 <span className="text-[10px] text-muted-foreground">
                   {analysis.capabilities.length} capabilities
                 </span>
               </div>
               <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                 {analysis.summary}
               </p>
             </div>
           ) : (
             <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAnalyze();
                }}
                disabled={loading}
                className="w-full h-8 rounded text-xs font-medium flex items-center justify-center gap-2 transition-colors bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
             >
                <Brain size={12} />
                {loading ? 'Analyzing...' : 'Analyze Server'}
             </button>
           )}
        </div>
      </div>
    </div>
  );
}

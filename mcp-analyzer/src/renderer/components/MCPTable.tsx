import { Zap, ZapOff, HelpCircle, Clock, Brain } from 'lucide-react';
import type { MCPServer, MCPAnalysis } from '../../shared/types';

interface MCPTableProps {
  servers: MCPServer[];
  analyses: Map<string, MCPAnalysis>;
  analyzingServers: Set<string>;
  onAnalyze: (server: MCPServer) => void;
  onSelect: (server: MCPServer) => void;
  selectedServerId?: string;
}

export default function MCPTable({
  servers,
  analyses,
  analyzingServers,
  onAnalyze,
  onSelect,
  selectedServerId,
}: MCPTableProps) {
  const statusConfig = {
    running: { icon: Zap, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Running' },
    stopped: { icon: ZapOff, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Stopped' },
    unknown: { icon: HelpCircle, color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Unknown' },
    stale: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-500/10', label: 'Stale' },
  };

  return (
    <div className="w-full">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/20">
            <th className="px-4 py-3 font-medium text-muted-foreground w-[25%]">Name</th>
            <th className="px-4 py-3 font-medium text-muted-foreground w-[15%]">Source</th>
            <th className="px-4 py-3 font-medium text-muted-foreground w-[25%]">Command</th>
            <th className="px-4 py-3 font-medium text-muted-foreground w-[10%]">Status</th>
            <th className="px-4 py-3 font-medium text-muted-foreground w-[15%]">Analysis</th>
            <th className="px-4 py-3 font-medium text-muted-foreground w-[10%]">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {servers.map((server) => {
            const isPlaceholder = server.id.startsWith('placeholder-');
            
            // Placeholder row for IDEs with no servers
            if (isPlaceholder) {
              return (
                <tr key={server.id} className="bg-muted/20">
                  <td colSpan={6} className="px-4 py-6 text-center">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <HelpCircle size={16} />
                      <span className="text-sm">{server.source}: No MCP servers configured</span>
                    </div>
                  </td>
                </tr>
              );
            }
            
            const status = statusConfig[server.status];
            const StatusIcon = status.icon;
            const analysis = analyses.get(server.id);
            const isSelected = selectedServerId === server.id;
            const isAnalyzing = analyzingServers.has(server.id);

            return (
              <tr
                key={server.id}
                onClick={() => onSelect(server)}
                className={`
                  group transition-colors cursor-pointer
                  ${isSelected ? 'bg-primary/5' : 'hover:bg-muted/30'}
                `}
              >
                <td className="px-4 py-3 font-medium text-foreground">
                  {server.name}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {server.source && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-secondary text-secondary-foreground border border-border/50">
                      {server.source}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground font-mono text-[11px] truncate max-w-[200px]">
                  {server.command} {server.args.slice(0, 2).join(' ')}
                </td>
                <td className="px-4 py-3">
                  <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ${status.bg} border border-transparent`}>
                    <StatusIcon size={10} className={status.color} />
                    <span className={`text-[10px] font-medium ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {analysis ? (
                    <div className="flex gap-2">
                      <span title="Capabilities" className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                         <span className="font-medium text-foreground">{analysis.capabilities.length}</span> caps
                      </span>
                      <span title="Use Cases" className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                         <span className="font-medium text-foreground">{analysis.useCases.length}</span> uses
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/50">Not analyzed</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {!analysis && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAnalyze(server);
                      }}
                      disabled={isAnalyzing}
                      className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-medium rounded hover:bg-primary hover:text-primary-foreground disabled:opacity-50 transition-all flex items-center gap-1.5"
                    >
                      <Brain size={10} />
                      {isAnalyzing ? 'Analyzing...' : 'Analyze'}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Wrench, Lightbulb, Cog, Box, Terminal, Clock, RefreshCw, Zap } from 'lucide-react';
import type { MCPServer, MCPAnalysis, MCPServerInfo } from '../../shared/types';

interface DetailViewProps {
  server: MCPServer | null;
  analysis?: MCPAnalysis;
  introspection?: MCPServerInfo;
  onReanalyze?: (server: MCPServer) => void;
  isAnalyzing?: boolean;
}

export default function DetailView({ server, analysis, introspection, onReanalyze, isAnalyzing }: DetailViewProps) {
  const [introspecting, setIntrospecting] = useState(false);
  const [introspectionData, setIntrospectionData] = useState<MCPServerInfo | null>(introspection || null);

  // Update introspection data when prop changes (server switch)
  useEffect(() => {
    setIntrospectionData(introspection || null);
  }, [introspection, server?.id]);

  const handleIntrospect = async () => {
    if (!server) return;
    
    setIntrospecting(true);
    try {
      const result = await window.electronAPI.introspectMCP(server.id, JSON.stringify(server), true);
      if (result.success && result.data) {
        setIntrospectionData(result.data);
      } else {
        setIntrospectionData({ error: result.error || 'Introspection failed' });
      }
    } catch {
      setIntrospectionData({ error: 'Failed to introspect server' });
    } finally {
      setIntrospecting(false);
    }
  };
  if (!server) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-card/30">
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <Box size={24} className="text-muted-foreground/40" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">No Server Selected</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
          Select an MCP server from the list to view its configuration and analysis
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="p-6 pb-4 border-b border-border sticky top-0 bg-card z-10">
        <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
          <Box size={14} />
          <span>Server Details</span>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">{server.name}</h2>
        <div className="flex items-center gap-2 mt-2">
          {server.source && (
            <span className="inline-block px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-[10px] font-medium border border-border">
              {server.source}
            </span>
          )}
          {analysis && onReanalyze && (
            <button
              onClick={() => onReanalyze(server)}
              disabled={isAnalyzing}
              className="ml-auto px-3 py-1 text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/20 rounded transition-colors disabled:opacity-50 flex items-center gap-1.5"
              title="Re-analyze this server"
            >
              <RefreshCw size={10} className={isAnalyzing ? 'animate-spin' : ''} />
              {isAnalyzing ? 'Analyzing...' : 'Re-analyze'}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Server Config */}
        <section>
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Terminal size={12} className="text-primary" />
            Configuration
          </h4>
          <div className="bg-muted/30 rounded-lg border border-border p-3 space-y-3">
            <div>
               <div className="text-[10px] uppercase text-muted-foreground font-medium mb-1">Command</div>
               <code className="text-xs font-mono text-foreground break-all">{server.command}</code>
            </div>
            {server.args.length > 0 && (
              <div>
                <div className="text-[10px] uppercase text-muted-foreground font-medium mb-1">Arguments</div>
                <div className="flex flex-wrap gap-1.5">
                   {server.args.map((arg, i) => (
                      <code key={i} className="text-[10px] px-2 py-0.5 bg-background border border-border rounded font-mono text-muted-foreground break-all whitespace-normal">{arg}</code>
                   ))}
                </div>
              </div>
            )}
            <div>
               <div className="text-[10px] uppercase text-muted-foreground font-medium mb-1">Config Path</div>
               <div className="text-xs text-muted-foreground break-all">{server.configPath}</div>
            </div>
          </div>
        </section>

        {/* Introspection Section - Actual Tools */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Zap size={12} className="text-primary" />
              Actual Tools & Capabilities
            </h4>
            <button
              onClick={handleIntrospect}
              disabled={introspecting}
              className="px-3 py-1 text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/20 rounded transition-colors disabled:opacity-50 flex items-center gap-1.5"
              title="Connect to server and fetch actual tools"
            >
              <Zap size={10} className={introspecting ? 'animate-spin' : ''} />
              {introspecting ? 'Fetching...' : introspectionData ? 'Refresh Tools' : 'Fetch Tools'}
            </button>
          </div>

          {introspectionData ? (
            introspectionData.error ? (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-xs text-destructive">{introspectionData.error}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {introspectionData.serverInfo && (
                  <div className="bg-muted/30 rounded-lg border border-border p-3">
                    <div className="text-[10px] uppercase text-muted-foreground font-medium mb-1">Server Info</div>
                    <div className="text-xs text-foreground">
                      {introspectionData.serverInfo.name} v{introspectionData.serverInfo.version}
                    </div>
                  </div>
                )}

                {introspectionData.tools && introspectionData.tools.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground font-medium mb-2">
                      Tools ({introspectionData.tools.length})
                    </div>
                    <div className="space-y-2">
                      {introspectionData.tools.map((tool, i) => (
                        <div key={i} className="bg-secondary/20 border border-border/50 rounded-lg p-3">
                          <div className="flex items-start gap-2 mb-1">
                            <code className="text-xs font-mono font-semibold text-foreground">{tool.name}</code>
                          </div>
                          {tool.description && (
                            <p className="text-xs text-muted-foreground mb-2">{tool.description}</p>
                          )}
                          {tool.inputSchema && (
                            <details className="mt-2">
                              <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground">
                                Input Schema
                              </summary>
                              <pre className="text-[9px] font-mono bg-background/50 p-2 rounded mt-1 overflow-x-auto">
                                {JSON.stringify(tool.inputSchema, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {introspectionData.resources && introspectionData.resources.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground font-medium mb-2">
                      Resources ({introspectionData.resources.length})
                    </div>
                    <div className="space-y-2">
                      {introspectionData.resources.map((resource, i) => (
                        <div key={i} className="bg-secondary/20 border border-border/50 rounded-lg p-3">
                          <code className="text-xs font-mono font-semibold text-foreground">{resource.name}</code>
                          {resource.description && (
                            <p className="text-xs text-muted-foreground mt-1">{resource.description}</p>
                          )}
                          <div className="text-[10px] text-muted-foreground mt-1 break-all">{resource.uri}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {introspectionData.prompts && introspectionData.prompts.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground font-medium mb-2">
                      Prompts ({introspectionData.prompts.length})
                    </div>
                    <div className="space-y-2">
                      {introspectionData.prompts.map((prompt, i) => (
                        <div key={i} className="bg-secondary/20 border border-border/50 rounded-lg p-3">
                          <code className="text-xs font-mono font-semibold text-foreground">{prompt.name}</code>
                          {prompt.description && (
                            <p className="text-xs text-muted-foreground mt-1">{prompt.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(!introspectionData.tools || introspectionData.tools.length === 0) &&
                 (!introspectionData.resources || introspectionData.resources.length === 0) &&
                 (!introspectionData.prompts || introspectionData.prompts.length === 0) && (
                  <div className="text-xs text-muted-foreground text-center py-4">
                    No tools, resources, or prompts found
                  </div>
                )}

                {introspectionData.introspectedAt && (
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50 pt-2">
                    <Clock size={10} />
                    <span>Fetched {new Date(introspectionData.introspectedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            )
          ) : (
            <div className="bg-muted/20 border border-border/50 rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground">
                Click "Fetch Tools" to connect to the server and retrieve actual capabilities
              </p>
            </div>
          )}
        </section>

        {analysis ? (
          <>
            {/* Purpose */}
            <section>
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Cog size={12} className="text-primary" />
                Purpose
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {analysis.purpose}
              </p>
            </section>

            {/* Capabilities */}
            <section>
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Wrench size={12} className="text-primary" />
                Capabilities
              </h4>
              <ul className="grid grid-cols-1 gap-2">
                {analysis.capabilities.map((cap, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2 bg-secondary/20 p-2 rounded-md border border-border/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <span className="leading-relaxed">{cap}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Use Cases */}
            <section>
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Lightbulb size={12} className="text-primary" />
                Use Cases
              </h4>
              <ul className="space-y-2">
                {analysis.useCases.map((use, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                     <div className="min-w-[4px] h-[4px] bg-secondary-foreground/30 rounded-full mt-1.5" />
                     <span className="leading-relaxed">{use}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* How It Works */}
            <section className="bg-primary/5 -mx-6 px-6 py-6 border-t border-b border-primary/10">
              <h4 className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">
                How It Works
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                {analysis.howItWorks}
              </p>
            </section>

            {/* Timestamp */}
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50 pt-2">
               <Clock size={10} />
               <span>Analyzed {new Date(analysis.analyzedAt).toLocaleString()}</span>
            </div>
          </>
        ) : (
           <div className="py-8 text-center border-t border-border border-dashed">
              <p className="text-xs text-muted-foreground mb-4">Analysis not available for this server</p>
           </div>
        )}
      </div>
    </div>
  );
}

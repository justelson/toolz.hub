export interface MCPServer {
  id: string;
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  status: 'running' | 'stopped' | 'unknown' | 'stale';
  configPath: string;
  disabled?: boolean;
  autoApprove?: string[];
  source?: string; // Which app/IDE this MCP is from
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface MCPAnalysis {
  serverId: string;
  summary: string;
  purpose: string;
  capabilities: string[];
  useCases: string[];
  howItWorks: string;
  tools?: MCPTool[];
  analyzedAt: string;
}

export interface MCPServerInfo {
  tools?: Array<{
    name: string;
    description?: string;
    inputSchema?: Record<string, unknown>;
  }>;
  resources?: Array<{
    uri: string;
    name: string;
    description?: string;
  }>;
  prompts?: Array<{
    name: string;
    description?: string;
  }>;
  serverInfo?: {
    name: string;
    version: string;
  };
  error?: string;
  introspectedAt?: string;
}

export interface ExportFormat {
  type: 'json' | 'markdown' | 'both';
  data: MCPServer[] | MCPAnalysis[];
}

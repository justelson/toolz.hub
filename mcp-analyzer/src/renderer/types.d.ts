export {};

import type { MCPServer, MCPAnalysis, MCPServerInfo } from '../shared/types';

interface ScanResultItem {
  server: MCPServer;
  analysis: MCPAnalysis | null;
  introspection: MCPServerInfo | null;
  needsAnalysis: boolean;
}

interface DbStats {
  totalServers: number;
  analyzedServers: number;
  totalAnalyses: number;
}

interface DatabaseAnalytics {
  totalServers: number;
  analyzedServers: number;
  introspectedServers: number;
  totalAnalyses: number;
  totalIntrospections: number;
  databaseSizeBytes: number;
  databaseSizeMB: string;
  oldestServer: string | null;
  newestServer: string | null;
  tableStats: Array<{ table: string; rows: number }>;
}

declare global {
  interface Window {
    electronAPI: {
      scanMCPs: () => Promise<{ success: boolean; data?: ScanResultItem[]; error?: string }>;
      analyzeMCP: (serverId: string, serverData: string, apiKey: string, forceReanalyze?: boolean) => Promise<{ success: boolean; data?: MCPAnalysis; error?: string; cached?: boolean }>;
      introspectMCP: (serverId: string, serverData: string, force?: boolean) => Promise<{ success: boolean; data?: MCPServerInfo; error?: string; cached?: boolean }>;
      exportData: (format: string, data: unknown) => Promise<{ success: boolean; data?: string; error?: string }>;
      windowMinimize: () => void;
      windowMaximize: () => void;
      windowClose: () => void;
      getDbStats: () => Promise<{ success: boolean; data?: DbStats; error?: string }>;
      getDbAnalytics: () => Promise<{ success: boolean; data?: DatabaseAnalytics; error?: string }>;
      getHistoricalServers: () => Promise<{ success: boolean; data?: Array<MCPServer & { firstSeen: string; lastSeen: string }>; error?: string }>;
      testGroqConnection: (apiKey: string) => Promise<{ success: boolean; message?: string; error?: string; errorType?: string; statusCode?: number; model?: string }>;
    };
  }
}

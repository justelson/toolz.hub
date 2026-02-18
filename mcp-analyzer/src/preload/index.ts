import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  scanMCPs: () => ipcRenderer.invoke('scan-mcps'),
  analyzeMCP: (serverId: string, serverData: string, apiKey: string, forceReanalyze?: boolean) =>
    ipcRenderer.invoke('analyze-mcp', serverId, serverData, apiKey, forceReanalyze),
  introspectMCP: (serverId: string, serverData: string, force = false) =>
    ipcRenderer.invoke('introspect-mcp', serverId, serverData, force),
  exportData: (format: string, data: unknown) =>
    ipcRenderer.invoke('export-data', format, data),
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),
  getDbStats: () => ipcRenderer.invoke('get-db-stats'),
  getDbAnalytics: () => ipcRenderer.invoke('get-db-analytics'),
  getHistoricalServers: () => ipcRenderer.invoke('get-historical-servers'),
  testGroqConnection: (apiKey: string) => ipcRenderer.invoke('test-groq-connection', apiKey),
});

import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, Download, Clock, Zap, Settings, Database, Sun, Moon } from 'lucide-react';
import Dashboard from './components/Dashboard';
import ExportModal from './components/ExportModal';
import SettingsModal from './components/SettingsModal';
import Toast from './components/Toast';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import type { MCPServer, MCPAnalysis, MCPServerInfo } from '../shared/types';

// Cache keys
const CACHE_KEYS = {
  SERVERS: 'mcp-analyzer-servers',
  ANALYSES: 'mcp-analyzer-analyses',
  LAST_SCAN: 'mcp-analyzer-last-scan',
  BOOT_TIME: 'mcp-analyzer-boot-time',
  API_KEY: 'mcp-analyzer-groq-api-key', // Changed to use consistent prefix
};

type ScanResultItem = {
  server: MCPServer;
  analysis: MCPAnalysis | null;
  introspection: MCPServerInfo | null;
  needsAnalysis: boolean;
};

function App() {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [analyses, setAnalyses] = useState<Map<string, MCPAnalysis>>(new Map());
  const [introspections, setIntrospections] = useState<Map<string, MCPServerInfo>>(new Map());
  const [analyzingServers, setAnalyzingServers] = useState<Set<string>>(new Set());
  const [scanning, setScanning] = useState(false);
  const [scanLatency, setScanLatency] = useState<number | null>(null);
  const [lastScanTime, setLastScanTime] = useState<string | null>(null);
  const [bootTime] = useState<string>(new Date().toLocaleTimeString());
  const [showExportModal, setShowExportModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [apiKey, setApiKey] = useState<string>('');
  const [settingsRevision, setSettingsRevision] = useState(0);
  const [dbStats, setDbStats] = useState<{ totalServers: number; analyzedServers: number; totalAnalyses: number } | null>(null);
  const scanningRef = useRef(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('mcp-analyzer-theme');
    return (saved as 'light' | 'dark') || 'dark';
  });

  // Apply theme to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('mcp-analyzer-theme', theme);
  }, [theme]);

  // Persist API key whenever it changes
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem(CACHE_KEYS.API_KEY, apiKey);
    }
  }, [apiKey]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const loadFromCache = useCallback(() => {
    try {
      const cachedServers = localStorage.getItem(CACHE_KEYS.SERVERS);
      const cachedAnalyses = localStorage.getItem(CACHE_KEYS.ANALYSES);
      const cachedLastScan = localStorage.getItem(CACHE_KEYS.LAST_SCAN);

      if (cachedServers) {
        const parsed = JSON.parse(cachedServers) as MCPServer[];
        setServers(parsed);
        setToast({ message: `Loaded ${parsed.length} servers from cache`, type: 'success' });
      }

      if (cachedAnalyses) {
        const analysesArray = JSON.parse(cachedAnalyses) as Array<[string, MCPAnalysis]>;
        setAnalyses(new Map(analysesArray));
      }

      if (cachedLastScan) {
        setLastScanTime(cachedLastScan);
      }
    } catch (error) {
      console.error('Failed to load from cache:', error);
      setToast({ message: 'Failed to load cached data', type: 'error' });
    }
  }, []);

  const saveToCache = useCallback(() => {
    try {
      localStorage.setItem(CACHE_KEYS.SERVERS, JSON.stringify(servers));
      localStorage.setItem(CACHE_KEYS.ANALYSES, JSON.stringify(Array.from(analyses.entries())));
    } catch (error) {
      console.error('Failed to save to cache:', error);
    }
  }, [servers, analyses]);

  const loadDbStats = useCallback(async () => {
    const result = await window.electronAPI.getDbStats();
    if (result.success && result.data) {
      setDbStats(result.data);
    }
  }, []);

  const scanServers = useCallback(async () => {
    if (scanningRef.current) return;
    
    scanningRef.current = true;
    setScanning(true);
    const startTime = performance.now();
    
    try {
      const result = await window.electronAPI.scanMCPs();
      
      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);
      setScanLatency(latency);
      
      if (result.success) {
        // Extract servers and pre-populate analyses from cache
        const serversWithAnalyses = (result.data || []) as ScanResultItem[];
        const newServers = serversWithAnalyses.map((item) => item.server);
        
        // Merge with existing data
        setServers((prev) => {
          const existingMap = new Map(prev.map((s) => [s.id, s]));
          return newServers.map((newServer) => {
            const existing = existingMap.get(newServer.id);
            return existing ? { ...existing, ...newServer } : newServer;
          });
        });
        
        // Pre-populate cached analyses and introspections
        const analysesById = new Map<string, MCPAnalysis>();
        const introspectionsById = new Map<string, MCPServerInfo>();
        let cachedCount = 0;
        let introspectionCount = 0;
        
        for (const item of serversWithAnalyses) {
          if (item.analysis) {
            analysesById.set(item.server.id, item.analysis);
            cachedCount++;
          }
          if (item.introspection) {
            introspectionsById.set(item.server.id, item.introspection);
            introspectionCount++;
          }
        }
        
        setAnalyses((prev) => {
          const next = new Map(prev);
          analysesById.forEach((value, key) => {
            next.set(key, value);
          });
          return next;
        });
        
        setIntrospections((prev) => {
          const next = new Map(prev);
          introspectionsById.forEach((value, key) => {
            next.set(key, value);
          });
          return next;
        });
        
        const now = new Date().toLocaleTimeString();
        setLastScanTime(now);
        localStorage.setItem(CACHE_KEYS.LAST_SCAN, now);
        
        const message = cachedCount > 0 || introspectionCount > 0
          ? `Found ${newServers.length} server(s) (${cachedCount} with analysis, ${introspectionCount} with tools)`
          : `Found ${newServers.length} server(s)`;
        setToast({ message, type: 'success' });
        
        // Refresh DB stats
        loadDbStats();
      } else {
        setToast({ message: 'Scan failed', type: 'error' });
      }
    } catch (error) {
      console.error('Scan failed:', error);
      setToast({ message: 'Scan failed', type: 'error' });
    } finally {
      scanningRef.current = false;
      setScanning(false);
    }
  }, [loadDbStats]);

  const analyzeServer = async (server: MCPServer, forceReanalyze = false) => {
    if (!apiKey) {
      setToast({ message: 'Please set your Groq API key in settings', type: 'error' });
      setShowSettingsModal(true);
      return;
    }
    
    setAnalyzingServers(prev => new Set(prev).add(server.id));
    const serverData = JSON.stringify(server, null, 2);
    const result = await window.electronAPI.analyzeMCP(server.id, serverData, apiKey, forceReanalyze);
    
    if (!result.success || !result.data) {
      setToast({ message: result.error || 'Analysis failed', type: 'error' });
    } else {
      const analysis = result.data;
      // Optimistic update
      setAnalyses(prev => new Map(prev).set(server.id, analysis));
      
      const message = result.cached 
        ? `Using cached analysis for ${server.name}`
        : `Analysis complete for ${server.name}`;
      setToast({ message, type: result.cached ? 'info' : 'success' });
      
      // Refresh DB stats if new analysis
      if (!result.cached) {
        loadDbStats();
      }
    }
    setAnalyzingServers(prev => {
      const next = new Set(prev);
      next.delete(server.id);
      return next;
    });
  };

  const exportData = async (format: 'json' | 'markdown' | 'both') => {
    const data = {
      servers,
      analyses: Array.from(analyses.values()),
    };
    
    const result = await window.electronAPI.exportData(format, data);
    if (result.success) {
      setToast({ message: result.data || 'Export successful', type: 'success' });
    } else {
      setToast({ message: 'Export failed', type: 'error' });
    }
    setShowExportModal(false);
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onScan: scanServers,
    onExport: () => setShowExportModal(true),
    onRefresh: scanServers,
  });

  // Load from cache on mount
  useEffect(() => {
    loadFromCache();
    // Save boot time
    localStorage.setItem(CACHE_KEYS.BOOT_TIME, bootTime);
    // Load API key
    const savedApiKey = localStorage.getItem(CACHE_KEYS.API_KEY) || '';
    setApiKey(savedApiKey);
    // Load DB stats
    loadDbStats();

    // Auto-scan if enabled
    const autoScan = localStorage.getItem('mcp-analyzer-auto-scan') === 'true';
    if (autoScan) {
      scanServers();
    }
  }, [bootTime, loadFromCache, loadDbStats, scanServers]);

  // Auto-save to cache when data changes
  useEffect(() => {
    saveToCache();
  }, [saveToCache]);

  // Auto-scan interval
  useEffect(() => {
    const savedInterval = parseInt(localStorage.getItem('mcp-analyzer-scan-interval') || '0', 10);
    
    if (savedInterval > 0) {
      console.log(`Setting up auto-scan interval: ${savedInterval} minutes`);
      const intervalId = setInterval(() => {
        console.log('Triggering periodic auto-scan...');
        scanServers();
      }, savedInterval * 60 * 1000);
      
      return () => clearInterval(intervalId);
    }
    return undefined;
  }, [scanServers, settingsRevision]);

  const runningCount = servers.filter(s => s.status === 'running').length;

  return (
    <div className="h-screen flex flex-col bg-background text-foreground font-sans">
      {/* Custom Title Bar */}
      <div className="h-10 bg-card border-b border-border flex items-center justify-between select-none z-50" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
        <div className="flex items-center gap-3 px-4">
          <div className="w-2.5 h-2.5 bg-primary rounded-sm" />
          <span className="text-xs font-bold tracking-widest text-muted-foreground">MCP ANALYZER</span>
          {runningCount > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 rounded-full">
              <Zap size={10} className="text-green-500" />
              <span className="text-[10px] font-medium text-green-500">{runningCount}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button
            onClick={() => window.electronAPI.windowMinimize()}
            className="h-10 w-10 hover:bg-muted transition-colors flex items-center justify-center text-muted-foreground hover:text-foreground"
            title="Minimize"
          >
            <div className="w-3 h-0.5 bg-current" />
          </button>
          <button
            onClick={() => window.electronAPI.windowMaximize()}
            className="h-10 w-10 hover:bg-muted transition-colors flex items-center justify-center text-muted-foreground hover:text-foreground"
            title="Maximize"
          >
            <div className="w-2.5 h-2.5 border-2 border-current rounded-sm" />
          </button>
          <button
            onClick={() => window.electronAPI.windowClose()}
            className="h-10 w-10 hover:bg-destructive hover:text-destructive-foreground transition-colors flex items-center justify-center text-muted-foreground"
            title="Close"
          >
            <div className="relative w-3 h-3">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3.5 h-0.5 bg-current rotate-45" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3.5 h-0.5 bg-current -rotate-45" />
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-card border-b border-border px-4 py-2 flex items-center gap-4 justify-between shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={scanServers}
            disabled={scanning}
            className="h-8 px-3 bg-primary text-primary-foreground text-xs font-medium rounded hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center gap-2 shadow-sm"
            title="Scan MCPs (Ctrl+R)"
          >
            <RefreshCw size={14} className={scanning ? 'animate-spin' : ''} />
            {scanning ? 'Scanning...' : 'Scan MCPs'}
          </button>
          
          <button
            onClick={() => setShowExportModal(true)}
            disabled={servers.length === 0}
            className="h-8 px-3 bg-secondary text-secondary-foreground text-xs font-medium rounded border border-border hover:bg-secondary/80 disabled:opacity-50 transition-all flex items-center gap-2"
            title="Export Data (Ctrl+E)"
          >
            <Download size={14} />
            Export
          </button>

           <div className="h-6 w-px bg-border mx-1" />

           <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {scanLatency !== null && (
                <div className="flex items-center gap-1.5" title="Last scan latency">
                  <Clock size={12} />
                  <span>{scanLatency}ms</span>
                </div>
              )}
              {lastScanTime && (
                <span className="hidden sm:inline">Updated {lastScanTime}</span>
              )}
           </div>
        </div>

        <div className="flex items-center gap-3">
           {dbStats && dbStats.totalServers > 0 && (
              <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                <Database size={12} />
                <span>{dbStats.totalServers} servers</span>
                <span className="w-0.5 h-3 bg-border" />
                <span>{dbStats.analyzedServers} analyzed</span>
              </div>
            )}
            
            <button
              onClick={toggleTheme}
              className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-all"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            
            <button
              onClick={() => setShowSettingsModal(true)}
              className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-all"
              title="Settings"
            >
              <Settings size={16} />
            </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        <Dashboard
          servers={servers}
          analyses={analyses}
          introspections={introspections}
          analyzingServers={analyzingServers}
          scanning={scanning}
          onAnalyze={analyzeServer}
          onScan={scanServers}
          onLoadFromCache={loadFromCache}
          hasCachedData={!!localStorage.getItem(CACHE_KEYS.SERVERS)}
        />
      </main>

      {/* Footer Status Bar - Optional, for boot time/system status if needed, or keep it minimal */}
      <div className="h-6 bg-card border-t border-border flex items-center justify-between px-3 text-[10px] text-muted-foreground select-none">
         <div className="flex items-center gap-3">
             <span>Boot: {bootTime}</span>
         </div>
         <div className="flex items-center gap-3">
            <span>Ctrl+R to Scan</span>
         </div>
      </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={exportData}
        serverCount={servers.length}
        analysisCount={analyses.size}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onSave={(key) => {
          setApiKey(key);
          setSettingsRevision(prev => prev + 1);
          setToast({ message: 'Settings saved successfully', type: 'success' });
        }}
      />

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default App;

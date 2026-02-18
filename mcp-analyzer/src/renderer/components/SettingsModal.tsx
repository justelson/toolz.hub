import { X, Key, CheckCircle, XCircle, Loader2, AlertCircle, Database, HardDrive, Settings, ShieldCheck, BarChart3, Clock, RefreshCw, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string) => void;
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

export default function SettingsModal({ isOpen, onClose, onSave }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [autoScan, setAutoScan] = useState(false);
  const [scanInterval, setScanInterval] = useState(0); // 0 means disabled
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [errorType, setErrorType] = useState('');
  const [activeTab, setActiveTab] = useState<'api' | 'database' | 'general'>('general');
  const [dbAnalytics, setDbAnalytics] = useState<DatabaseAnalytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const savedKey = localStorage.getItem('mcp-analyzer-groq-api-key') || '';
      const savedAutoScan = localStorage.getItem('mcp-analyzer-auto-scan') === 'true';
      const savedInterval = parseInt(localStorage.getItem('mcp-analyzer-scan-interval') || '0', 10);
      setApiKey(savedKey);
      setAutoScan(savedAutoScan);
      setScanInterval(savedInterval);
      setConnectionStatus('idle');
      setErrorMessage('');
      setErrorType('');
      
      if (savedKey) {
        testConnection(savedKey);
      }

      loadDatabaseAnalytics();
    }
  }, [isOpen]);

  const loadDatabaseAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const result = await window.electronAPI.getDbAnalytics();
      if (result.success && result.data) {
        setDbAnalytics(result.data);
      }
    } catch {
      console.error('Failed to load database analytics');
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const testConnection = async (keyToTest: string) => {
    if (!keyToTest || keyToTest.trim() === '') {
      setConnectionStatus('idle');
      return;
    }

    setTesting(true);
    setConnectionStatus('idle');
    setErrorMessage('');
    setErrorType('');

    try {
      const result = await window.electronAPI.testGroqConnection(keyToTest);

      if (result.success) {
        setConnectionStatus('success');
      } else {
        setConnectionStatus('error');
        setErrorMessage(result.error || 'Connection failed');
        setErrorType(result.errorType || 'unknown');
      }
    } catch {
      setConnectionStatus('error');
      setErrorMessage('Failed to test connection');
      setErrorType('unknown');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    localStorage.setItem('mcp-analyzer-groq-api-key', apiKey);
    localStorage.setItem('mcp-analyzer-auto-scan', autoScan.toString());
    localStorage.setItem('mcp-analyzer-scan-interval', scanInterval.toString());
    onSave(apiKey);
    onClose();
  };

  const handleTestConnection = () => {
    testConnection(apiKey);
  };

  const getErrorColor = () => {
    switch (errorType) {
      case 'rate_limit':
        return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400';
      case 'network_error':
        return 'bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400';
      default:
        return 'bg-destructive/10 border-destructive/30 text-destructive';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden animate-fade-in flex h-[600px]">
        
        {/* Sidebar */}
        <aside className="w-56 border-r border-border bg-muted/30 flex flex-col">
          <div className="p-6 border-b border-border bg-card/50">
            <div className="flex items-center gap-2 mb-1">
              <Settings size={18} className="text-primary" />
              <h3 className="font-bold tracking-tight text-foreground">Settings</h3>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              Preferences
            </p>
          </div>

          <nav className="flex-1 p-3 space-y-1">
            <button
              onClick={() => setActiveTab('general')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'general'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Zap size={16} />
              General
            </button>
            <button
              onClick={() => setActiveTab('api')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'api'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Key size={16} />
              Groq API
            </button>
            <button
              onClick={() => setActiveTab('database')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'database'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Database size={16} />
              Database
            </button>
          </nav>

          <div className="p-4 border-t border-border">
            <button
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors border border-transparent hover:border-border"
            >
              <X size={14} />
              Close
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col bg-background min-w-0">
          {/* Header */}
          <div className="px-8 py-6 border-b border-border bg-card/20 sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  {activeTab === 'general' ? 'General Settings' : activeTab === 'api' ? 'API Configuration' : 'Database Insights'}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {activeTab === 'general'
                    ? 'Manage application behavior and startup preferences'
                    : activeTab === 'api' 
                    ? 'Configure your Groq API key for server analysis' 
                    : 'Review storage metrics and data statistics'}
                </p>
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-8">
            {activeTab === 'general' && (
              <div className="max-w-xl space-y-8">
                <section>
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Zap size={12} className="text-primary" />
                    Startup Behavior
                  </h4>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-muted/30 border border-border rounded-xl group hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setAutoScan(!autoScan)}>
                      <div className="space-y-0.5">
                        <div className="text-sm font-bold text-foreground">Auto-scan on startup</div>
                        <div className="text-[10px] text-muted-foreground leading-relaxed">Automatically detect MCP servers when the application launches.</div>
                      </div>
                      <div className={`w-10 h-5 rounded-full transition-colors relative ${autoScan ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
                        <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${autoScan ? 'translate-x-5' : ''}`} />
                      </div>
                    </div>

                    <div className="p-4 bg-muted/30 border border-border rounded-xl group hover:border-primary/30 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="space-y-0.5">
                          <div className="text-sm font-bold text-foreground">Auto-scan Interval</div>
                          <div className="text-[10px] text-muted-foreground leading-relaxed">Periodic scanning for new or updated MCP servers.</div>
                        </div>
                        <select 
                          value={scanInterval}
                          onChange={(e) => setScanInterval(parseInt(e.target.value, 10))}
                          className="bg-background border border-border rounded px-2 py-1 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary/50"
                        >
                          <option value={0}>Disabled</option>
                          <option value={5}>5 minutes</option>
                          <option value={15}>15 minutes</option>
                          <option value={30}>30 minutes</option>
                          <option value={60}>1 hour</option>
                          <option value={360}>6 hours</option>
                          <option value={720}>12 hours</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Settings size={12} className="text-primary" />
                    App Info
                  </h4>
                  <div className="bg-muted/30 rounded-lg border border-border p-4 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Version</span>
                      <span className="text-foreground font-mono">1.0.0</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Environment</span>
                      <span className="text-foreground font-mono">Production</span>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'api' && (
              <div className="max-w-xl space-y-8">
                <section>
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Key size={12} className="text-primary" />
                    Authentication
                  </h4>
                  
                  <div className="space-y-4">
                    <div className="relative group">
                      <label className="text-[10px] font-semibold text-muted-foreground mb-1.5 block px-1">Groq API Key</label>
                      <div className="relative">
                        <input
                          type="password"
                          value={apiKey}
                          onChange={(e) => {
                            setApiKey(e.target.value);
                            setConnectionStatus('idle');
                            setErrorMessage('');
                          }}
                          placeholder="gsk_..."
                          className="w-full px-4 py-3 bg-muted/30 border border-border rounded-lg text-sm font-mono focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none transition-all placeholder:text-muted-foreground/30"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                          {testing && <Loader2 size={16} className="text-primary animate-spin" />}
                          {!testing && connectionStatus === 'success' && <CheckCircle size={16} className="text-green-500" />}
                          {!testing && connectionStatus === 'error' && <XCircle size={16} className="text-destructive" />}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <a
                        href="https://console.groq.com/keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-semibold text-primary hover:underline"
                      >
                        Get a key from Groq Console →
                      </a>
                      
                      <button
                        onClick={handleTestConnection}
                        disabled={testing || !apiKey}
                        className="text-[10px] font-bold text-primary px-3 py-1.5 hover:bg-primary/10 rounded-md transition-colors disabled:opacity-30 uppercase tracking-wider"
                      >
                        {testing ? 'Testing...' : 'Test Connection'}
                      </button>
                    </div>
                  </div>

                  {connectionStatus === 'error' && errorMessage && (
                    <div className={`mt-4 p-4 border rounded-lg animate-slide-in ${getErrorColor()}`}>
                      <div className="flex gap-3">
                        <AlertCircle size={16} className="shrink-0" />
                        <div className="text-xs leading-relaxed">
                          <span className="font-bold">Connection failed:</span> {errorMessage}
                        </div>
                      </div>
                    </div>
                  )}

                  {connectionStatus === 'success' && (
                    <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 rounded-lg animate-slide-in">
                      <div className="flex gap-3">
                        <CheckCircle size={16} className="shrink-0" />
                        <div className="text-xs font-semibold">
                          Connected successfully to Groq Cloud.
                        </div>
                      </div>
                    </div>
                  )}
                </section>

                <section>
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                    <ShieldCheck size={12} className="text-primary" />
                    Security & Privacy
                  </h4>
                  <div className="bg-muted/30 rounded-lg border border-border p-4">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Your Groq API key is stored <span className="text-foreground font-semibold underline decoration-primary/30 decoration-2 underline-offset-2">locally on this machine</span>. It is never transmitted to any third-party server except Groq's official API endpoints for server analysis.
                    </p>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'database' && (
              <div className="space-y-8">
                {loadingAnalytics ? (
                  <div className="flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground">
                    <Loader2 size={32} className="text-primary animate-spin" />
                    <p className="text-xs font-mono tracking-widest uppercase">Calculating Metrics...</p>
                  </div>
                ) : dbAnalytics ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-muted/30 border border-border rounded-xl p-5 group hover:border-primary/30 transition-colors">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            <HardDrive size={18} />
                          </div>
                          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Disk Usage</h4>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold tracking-tight text-foreground">{dbAnalytics.databaseSizeMB}</span>
                          <span className="text-sm font-medium text-muted-foreground">MB</span>
                        </div>
                        <div className="mt-2 text-[10px] font-mono text-muted-foreground/60">
                          {dbAnalytics.databaseSizeBytes.toLocaleString()} bytes
                        </div>
                      </div>

                      <div className="bg-muted/30 border border-border rounded-xl p-5 group hover:border-primary/30 transition-colors">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            <BarChart3 size={18} />
                          </div>
                          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Records</h4>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold tracking-tight text-foreground">
                            {(dbAnalytics.tableStats || []).reduce((sum, t) => sum + (t?.rows || 0), 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="mt-2 text-[10px] font-mono text-muted-foreground/60">
                          across {(dbAnalytics.tableStats || []).length} system tables
                        </div>
                      </div>
                    </div>

                    <section>
                      <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Database size={12} className="text-primary" />
                        Table Breakdown
                      </h4>
                      <div className="bg-card border border-border rounded-lg overflow-hidden">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-muted/50 border-b border-border">
                              <th className="px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Table Name</th>
                              <th className="px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">Row Count</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {(dbAnalytics.tableStats || []).map((table, idx) => (
                              <tr key={idx} className="hover:bg-muted/20 transition-colors">
                                <td className="px-4 py-3 text-xs font-mono text-foreground">{table.table}</td>
                                <td className="px-4 py-3 text-xs font-mono text-right font-semibold text-muted-foreground">
                                  {(table.rows || 0).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>

                    <section>
                      <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Clock size={12} className="text-primary" />
                        Temporal Data
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        {dbAnalytics.oldestServer && (
                          <div className="p-3 bg-muted/20 border border-border rounded-lg">
                            <div className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Oldest Record</div>
                            <div className="font-mono text-foreground">{new Date(dbAnalytics.oldestServer).toLocaleString()}</div>
                          </div>
                        )}
                        {dbAnalytics.newestServer && (
                          <div className="p-3 bg-muted/20 border border-border rounded-lg">
                            <div className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Newest Record</div>
                            <div className="font-mono text-foreground">{new Date(dbAnalytics.newestServer).toLocaleString()}</div>
                          </div>
                        )}
                      </div>
                    </section>

                    <div className="flex justify-end pt-4">
                      <button
                        onClick={loadDatabaseAnalytics}
                        disabled={loadingAnalytics}
                        className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground text-xs font-bold rounded-lg border border-border hover:bg-secondary/80 transition-all disabled:opacity-50 uppercase tracking-wider"
                      >
                        <RefreshCw size={14} className={loadingAnalytics ? 'animate-spin' : ''} />
                        Refresh Data
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-border rounded-xl">
                    <p className="text-sm text-destructive font-bold mb-2">Metrics Unavailable</p>
                    <p className="text-xs text-muted-foreground">Failed to establish connection with the local database engine.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-8 py-5 border-t border-border bg-card/50 flex justify-end gap-3 sticky bottom-0">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
            >
              Cancel
            </button>
            {(activeTab === 'api' || activeTab === 'general') && (
              <button
                onClick={handleSave}
                disabled={activeTab === 'api' && connectionStatus === 'error'}
                className="px-6 py-2.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
              >
                Save Settings
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

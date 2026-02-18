import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { scanMCPServers } from './mcp-scanner';
import { analyzeMCPWithGroq } from './ai-analyzer';
import { introspectMCPServer } from './mcp-introspector';
import { exportData } from './exporter';
import { 
  initDatabase, 
  saveServer, 
  getCachedAnalysis, 
  saveAnalysis, 
  generateConfigHash,
  getAllHistoricalServers,
  getAnalysisStats,
  closeDatabase,
  cleanupDatabase,
  saveIntrospection,
  getCachedIntrospection,
  getDatabaseAnalytics
} from './database';

// ES module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    backgroundColor: '#1c2433',
    titleBarStyle: 'hidden',
    frame: false,
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL
    || (process.env.VITE_PORT ? `http://localhost:${process.env.VITE_PORT}` : undefined);

  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
    // Don't open DevTools automatically
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  try {
    initDatabase();
    // Clean up database on startup
    const cleanup = cleanupDatabase();
    if (cleanup.duplicatesRemoved > 0 || cleanup.orphanedRemoved > 0) {
      console.log(`Database cleanup: ${cleanup.duplicatesRemoved} duplicates, ${cleanup.orphanedRemoved} orphaned analyses removed`);
    }
  } catch (error) {
    console.error('Database initialization failed, continuing without database:', error);
  }
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  closeDatabase();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('scan-mcps', async () => {
  try {
    const servers = await scanMCPServers();
    
    // Save all servers to database (gracefully handles if DB not available)
    for (const server of servers) {
      saveServer(server);
    }
    
    // Attach cached analyses and introspections
    const serversWithAnalyses = servers.map(server => {
      const configHash = generateConfigHash(server);
      const cachedAnalysis = getCachedAnalysis(server.id, configHash);
      const cachedIntrospection = getCachedIntrospection(server.id);
      return {
        server,
        analysis: cachedAnalysis,
        introspection: cachedIntrospection,
        needsAnalysis: cachedAnalysis === null,
      };
    });
    
    return { success: true, data: serversWithAnalyses };
  } catch (error) {
    console.error('Scan error:', error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('analyze-mcp', async (_, serverId: string, serverData: string, apiKey: string, forceReanalyze = false) => {
  try {
    const server = JSON.parse(serverData);
    const configHash = generateConfigHash(server);
    
    // Check cache first (unless force re-analyze)
    if (!forceReanalyze) {
      const cachedAnalysis = getCachedAnalysis(serverId, configHash);
      if (cachedAnalysis) {
        console.log('Using cached analysis for:', serverId);
        return { success: true, data: cachedAnalysis, cached: true };
      }
    } else {
      console.log('Force re-analyzing:', serverId);
    }
    
    // Perform new analysis
    console.log('Performing new analysis for:', serverId);
    const analysis = await analyzeMCPWithGroq(serverId, serverData, apiKey);
    
    // Save to database
    saveAnalysis(analysis, configHash);
    
    return { success: true, data: analysis, cached: false };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('export-data', async (_, format: string, data: unknown) => {
  try {
    const result = await exportData(format, data);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.on('window-minimize', () => {
  mainWindow?.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on('window-close', () => {
  mainWindow?.close();
});

// Database stats
ipcMain.handle('get-db-stats', async () => {
  try {
    const stats = getAnalysisStats();
    return { success: true, data: stats };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Database analytics - detailed stats
ipcMain.handle('get-db-analytics', async () => {
  try {
    const analytics = getDatabaseAnalytics();
    return { success: true, data: analytics };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Get historical servers
ipcMain.handle('get-historical-servers', async () => {
  try {
    const servers = getAllHistoricalServers();
    return { success: true, data: servers };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Cleanup database - remove duplicates and orphaned data
ipcMain.handle('cleanup-database', async () => {
  try {
    const result = cleanupDatabase();
    return { 
      success: true, 
      data: result,
      message: `Removed ${result.duplicatesRemoved} duplicates and ${result.orphanedRemoved} orphaned analyses`
    };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Introspect MCP server - get actual tools/capabilities
ipcMain.handle('introspect-mcp', async (_, serverId: string, serverData: string, force = false) => {
  try {
    // Check cache first (unless forced). Skip cached errors so user can retry.
    const cached = getCachedIntrospection(serverId);
    if (cached && !force && !cached.error) {
      console.log('Using cached introspection for:', serverId);
      return { success: true, data: cached, cached: true };
    }
    
    const server = JSON.parse(serverData);
    const info = await introspectMCPServer(server);
    
    // Save to database
    saveIntrospection(serverId, info);
    
    return { success: true, data: info, cached: false };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Test Groq API connection
ipcMain.handle('test-groq-connection', async (_, apiKey: string) => {
  try {
    if (!apiKey || apiKey.trim() === '') {
      return { 
        success: false, 
        error: 'API key is required',
        errorType: 'missing_key'
      };
    }

    const Groq = (await import('groq-sdk')).default;
    const groq = new Groq({ apiKey });

    // Make a minimal test request
    const response = await groq.chat.completions.create({
      messages: [{ role: 'user', content: 'Hi' }],
      model: 'llama-3.3-70b-versatile',
      max_tokens: 5,
      temperature: 0,
    });

    if (response.choices && response.choices.length > 0) {
      return { 
        success: true, 
        message: 'Connection successful',
        model: 'llama-3.3-70b-versatile'
      };
    }

    return { 
      success: false, 
      error: 'Unexpected response from API',
      errorType: 'unknown'
    };
  } catch (error: unknown) {
    const err = error as { status?: number; code?: string; message?: string };
    console.error('Groq API test error:', err);
    
    // Parse error details
    let errorMessage = 'Connection failed';
    let errorType = 'unknown';
    
    if (err.status === 401) {
      errorMessage = 'Invalid API key - Please check your key and try again';
      errorType = 'invalid_key';
    } else if (err.status === 429) {
      errorMessage = 'Rate limit exceeded - Please wait a moment and try again';
      errorType = 'rate_limit';
    } else if (err.status === 403) {
      errorMessage = 'Access forbidden - Your API key may not have the required permissions';
      errorType = 'forbidden';
    } else if (err.status === 500 || err.status === 502 || err.status === 503) {
      errorMessage = 'Groq API is temporarily unavailable - Please try again later';
      errorType = 'server_error';
    } else if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
      errorMessage = 'Network error - Please check your internet connection';
      errorType = 'network_error';
    } else if (err.message) {
      errorMessage = err.message;
    }
    
    return { 
      success: false, 
      error: errorMessage,
      errorType,
      statusCode: err.status
    };
  }
});


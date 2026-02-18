import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';
import type { MCPServer, MCPAnalysis } from '../shared/types';

let db: Database.Database | null = null;

// Initialize database
export function initDatabase() {
  try {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'mcp-analyzer.db');
    
    // Ensure directory exists
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }

    db = new Database(dbPath);
    
    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS mcp_servers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        command TEXT NOT NULL,
        args TEXT NOT NULL,
        env TEXT,
        config_path TEXT,
        source TEXT,
        config_hash TEXT NOT NULL,
        first_seen TEXT NOT NULL,
        last_seen TEXT NOT NULL,
        disabled INTEGER DEFAULT 0,
        auto_approve TEXT
      );

      CREATE TABLE IF NOT EXISTS mcp_analyses (
        server_id TEXT PRIMARY KEY,
        summary TEXT NOT NULL,
        purpose TEXT NOT NULL,
        capabilities TEXT NOT NULL,
        use_cases TEXT NOT NULL,
        how_it_works TEXT NOT NULL,
        tools TEXT,
        analyzed_at TEXT NOT NULL,
        config_hash TEXT NOT NULL,
        FOREIGN KEY (server_id) REFERENCES mcp_servers(id)
      );

      CREATE TABLE IF NOT EXISTS mcp_introspections (
        server_id TEXT PRIMARY KEY,
        tools TEXT,
        resources TEXT,
        prompts TEXT,
        server_info TEXT,
        error TEXT,
        introspected_at TEXT NOT NULL,
        FOREIGN KEY (server_id) REFERENCES mcp_servers(id)
      );

      CREATE INDEX IF NOT EXISTS idx_server_name ON mcp_servers(name);
      CREATE INDEX IF NOT EXISTS idx_config_hash ON mcp_servers(config_hash);
      CREATE INDEX IF NOT EXISTS idx_last_seen ON mcp_servers(last_seen);
    `);

    console.log('Database initialized at:', dbPath);
  } catch (error) {
    console.error('Failed to initialize database:', error);
    // Don't throw - allow app to continue without database
  }
}

// Generate hash for server config to detect changes
function generateConfigHash(server: MCPServer): string {
  const configString = JSON.stringify({
    command: server.command,
    args: server.args,
    env: server.env,
  });
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < configString.length; i++) {
    const char = configString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

// Save or update server
export function saveServer(server: MCPServer): void {
  if (!db) {
    console.warn('Database not initialized, skipping server save');
    return;
  }

  try {
    const configHash = generateConfigHash(server);
    const now = new Date().toISOString();

    const existing = db.prepare('SELECT id, config_hash FROM mcp_servers WHERE id = ?').get(server.id) as { id: string; config_hash: string } | undefined;

    if (existing) {
      // Update last_seen and config if changed
      db.prepare(`
        UPDATE mcp_servers 
        SET last_seen = ?, config_hash = ?, command = ?, args = ?, env = ?, source = ?
        WHERE id = ?
      `).run(now, configHash, server.command, JSON.stringify(server.args), JSON.stringify(server.env || {}), server.source || null, server.id);
    } else {
      // Insert new server
      db.prepare(`
        INSERT INTO mcp_servers (id, name, command, args, env, config_path, source, config_hash, first_seen, last_seen, disabled, auto_approve)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        server.id,
        server.name,
        server.command,
        JSON.stringify(server.args),
        JSON.stringify(server.env || {}),
        server.configPath,
        server.source || null,
        configHash,
        now,
        now,
        server.disabled ? 1 : 0,
        JSON.stringify(server.autoApprove || [])
      );
    }
  } catch (error) {
    console.error('Failed to save server:', error);
  }
}

// Get cached analysis for a server
export function getCachedAnalysis(serverId: string, currentConfigHash: string): MCPAnalysis | null {
  if (!db) return null;

  try {
    interface AnalysisRow {
      server_id: string;
      summary: string;
      purpose: string;
      capabilities: string;
      use_cases: string;
      how_it_works: string;
      tools: string | null;
      analyzed_at: string;
      config_hash: string;
    }

    const row = db.prepare(`
      SELECT a.* 
      FROM mcp_analyses a
      WHERE a.server_id = ? AND a.config_hash = ?
    `).get(serverId, currentConfigHash) as AnalysisRow | undefined;

    if (!row) return null;

    return {
      serverId: row.server_id,
      summary: row.summary,
      purpose: row.purpose,
      capabilities: JSON.parse(row.capabilities),
      useCases: JSON.parse(row.use_cases),
      howItWorks: row.how_it_works,
      tools: row.tools ? JSON.parse(row.tools) : undefined,
      analyzedAt: row.analyzed_at,
    };
  } catch (error) {
    console.error('Failed to get cached analysis:', error);
    return null;
  }
}

// Save analysis
export function saveAnalysis(analysis: MCPAnalysis, configHash: string): void {
  if (!db) {
    console.warn('Database not initialized, skipping analysis save');
    return;
  }

  try {
    db.prepare(`
      INSERT OR REPLACE INTO mcp_analyses (server_id, summary, purpose, capabilities, use_cases, how_it_works, tools, analyzed_at, config_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      analysis.serverId,
      analysis.summary,
      analysis.purpose,
      JSON.stringify(analysis.capabilities),
      JSON.stringify(analysis.useCases),
      analysis.howItWorks,
      analysis.tools ? JSON.stringify(analysis.tools) : null,
      analysis.analyzedAt,
      configHash
    );
  } catch (error) {
    console.error('Failed to save analysis:', error);
  }
}

// Get all historical servers
export function getAllHistoricalServers(): Array<MCPServer & { firstSeen: string; lastSeen: string }> {
  if (!db) return [];

  try {
    interface ServerRow {
      id: string;
      name: string;
      command: string;
      args: string;
      env: string;
      config_path: string;
      source: string | null;
      config_hash: string;
      first_seen: string;
      last_seen: string;
      disabled: number;
      auto_approve: string;
    }

    const rows = db.prepare(`
      SELECT * FROM mcp_servers ORDER BY last_seen DESC
    `).all() as ServerRow[];

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      command: row.command,
      args: JSON.parse(row.args) as string[],
      env: JSON.parse(row.env) as Record<string, string>,
      status: (row.source === 'Toolz' ? 'stale' : 'unknown') as MCPServer['status'],
      configPath: row.config_path,
      source: row.source || undefined,
      disabled: row.disabled === 1,
      autoApprove: JSON.parse(row.auto_approve || '[]') as string[],
      firstSeen: row.first_seen,
      lastSeen: row.last_seen,
    }));
  } catch (error) {
    console.error('Failed to get historical servers:', error);
    return [];
  }
}

// Get analysis stats
export function getAnalysisStats(): { totalServers: number; analyzedServers: number; totalAnalyses: number } {
  if (!db) return { totalServers: 0, analyzedServers: 0, totalAnalyses: 0 };

  try {
    interface StatsRow {
      total_servers: number;
      analyzed_servers: number;
      total_analyses: number;
    }

    const stats = db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM mcp_servers) as total_servers,
        (SELECT COUNT(DISTINCT server_id) FROM mcp_analyses) as analyzed_servers,
        (SELECT COUNT(*) FROM mcp_analyses) as total_analyses
    `).get() as StatsRow;

    return {
      totalServers: stats.total_servers,
      analyzedServers: stats.analyzed_servers,
      totalAnalyses: stats.total_analyses,
    };
  } catch (error) {
    console.error('Failed to get analysis stats:', error);
    return { totalServers: 0, analyzedServers: 0, totalAnalyses: 0 };
  }
}

// Check if analysis exists and is valid
export function needsAnalysis(server: MCPServer): boolean {
  if (!db) return true;

  try {
    const configHash = generateConfigHash(server);
    const analysis = getCachedAnalysis(server.id, configHash);
    
    return analysis === null;
  } catch (error) {
    console.error('Failed to check if analysis needed:', error);
    return true;
  }
}

// Export for use in other modules
export { generateConfigHash };

// Save introspection data
export function saveIntrospection(serverId: string, introspectionData: {
  tools?: Array<{ name: string; description?: string; inputSchema?: Record<string, unknown> }>;
  resources?: Array<{ uri: string; name: string; description?: string }>;
  prompts?: Array<{ name: string; description?: string }>;
  serverInfo?: { name: string; version: string };
  error?: string;
}): void {
  if (!db) {
    console.warn('Database not initialized, skipping introspection save');
    return;
  }

  try {
    const now = new Date().toISOString();
    
    db.prepare(`
      INSERT OR REPLACE INTO mcp_introspections (server_id, tools, resources, prompts, server_info, error, introspected_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      serverId,
      introspectionData.tools ? JSON.stringify(introspectionData.tools) : null,
      introspectionData.resources ? JSON.stringify(introspectionData.resources) : null,
      introspectionData.prompts ? JSON.stringify(introspectionData.prompts) : null,
      introspectionData.serverInfo ? JSON.stringify(introspectionData.serverInfo) : null,
      introspectionData.error || null,
      now
    );
  } catch (error) {
    console.error('Failed to save introspection:', error);
  }
}

// Get cached introspection data
export function getCachedIntrospection(serverId: string): {
  tools?: Array<{ name: string; description?: string; inputSchema?: Record<string, unknown> }>;
  resources?: Array<{ uri: string; name: string; description?: string }>;
  prompts?: Array<{ name: string; description?: string }>;
  serverInfo?: { name: string; version: string };
  error?: string;
  introspectedAt?: string;
} | null {
  if (!db) return null;

  try {
    interface IntrospectionRow {
      tools: string | null;
      resources: string | null;
      prompts: string | null;
      server_info: string | null;
      error: string | null;
      introspected_at: string;
    }

    const row = db.prepare(`
      SELECT * FROM mcp_introspections WHERE server_id = ?
    `).get(serverId) as IntrospectionRow | undefined;

    if (!row) return null;

    return {
      tools: row.tools ? JSON.parse(row.tools) : undefined,
      resources: row.resources ? JSON.parse(row.resources) : undefined,
      prompts: row.prompts ? JSON.parse(row.prompts) : undefined,
      serverInfo: row.server_info ? JSON.parse(row.server_info) : undefined,
      error: row.error || undefined,
      introspectedAt: row.introspected_at,
    };
  } catch (error) {
    console.error('Failed to get cached introspection:', error);
    return null;
  }
}

// Close database
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// Clean up database - remove duplicates and orphaned data
export function cleanupDatabase(): { duplicatesRemoved: number; orphanedRemoved: number } {
  if (!db) {
    console.warn('Database not initialized, skipping cleanup');
    return { duplicatesRemoved: 0, orphanedRemoved: 0 };
  }

  try {
    console.log('Starting database cleanup...');
    
    // Find and remove duplicates (keep most recent by id)
    const duplicates = db.prepare(`
      SELECT name, source, COUNT(*) as count
      FROM mcp_servers
      GROUP BY name, source
      HAVING count > 1
    `).all() as Array<{ name: string; source: string | null; count: number }>;

    let duplicatesRemoved = 0;
    
    for (const dup of duplicates) {
      interface ServerRow {
        id: string;
        last_seen: string;
      }
      
      const dupeRows = db.prepare(`
        SELECT id, last_seen FROM mcp_servers 
        WHERE name = ? AND (source = ? OR (source IS NULL AND ? IS NULL))
        ORDER BY last_seen DESC
      `).all(dup.name, dup.source, dup.source) as ServerRow[];
      
      // Keep the first (most recent), delete the rest
      const toDelete = dupeRows.slice(1);
      
      for (const row of toDelete) {
        console.log(`Removing duplicate: ${row.id}`);
        // Delete analyses first (foreign key constraint)
        db.prepare('DELETE FROM mcp_analyses WHERE server_id = ?').run(row.id);
        // Then delete the server
        db.prepare('DELETE FROM mcp_servers WHERE id = ?').run(row.id);
        duplicatesRemoved++;
      }
    }
    
    // Remove orphaned analyses
    const orphanedAnalysesResult = db.prepare(`
      DELETE FROM mcp_analyses
      WHERE server_id NOT IN (SELECT id FROM mcp_servers)
    `).run();
    
    // Remove orphaned introspections
    const orphanedIntrospectionsResult = db.prepare(`
      DELETE FROM mcp_introspections
      WHERE server_id NOT IN (SELECT id FROM mcp_servers)
    `).run();
    
    const orphanedRemoved = orphanedAnalysesResult.changes + orphanedIntrospectionsResult.changes;
    
    console.log(`Cleanup complete: ${duplicatesRemoved} duplicates removed, ${orphanedRemoved} orphaned analyses removed`);
    
    return { duplicatesRemoved, orphanedRemoved };
  } catch (error) {
    console.error('Failed to cleanup database:', error);
    return { duplicatesRemoved: 0, orphanedRemoved: 0 };
  }
}

// Get comprehensive database analytics
export function getDatabaseAnalytics(): {
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
} {
  if (!db) {
    return {
      totalServers: 0,
      analyzedServers: 0,
      introspectedServers: 0,
      totalAnalyses: 0,
      totalIntrospections: 0,
      databaseSizeBytes: 0,
      databaseSizeMB: '0.00',
      oldestServer: null,
      newestServer: null,
      tableStats: [],
    };
  }

  try {
    // Get basic stats
    interface StatsRow {
      total_servers: number;
      analyzed_servers: number;
      introspected_servers: number;
      total_analyses: number;
      total_introspections: number;
      oldest_server: string | null;
      newest_server: string | null;
    }

    const stats = db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM mcp_servers) as total_servers,
        (SELECT COUNT(DISTINCT server_id) FROM mcp_analyses) as analyzed_servers,
        (SELECT COUNT(DISTINCT server_id) FROM mcp_introspections) as introspected_servers,
        (SELECT COUNT(*) FROM mcp_analyses) as total_analyses,
        (SELECT COUNT(*) FROM mcp_introspections) as total_introspections,
        (SELECT first_seen FROM mcp_servers ORDER BY first_seen ASC LIMIT 1) as oldest_server,
        (SELECT last_seen FROM mcp_servers ORDER BY last_seen DESC LIMIT 1) as newest_server
    `).get() as StatsRow;

    // Get table row counts
    interface TableRow {
      name: string;
    }

    const tables = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all() as TableRow[];

    const tableStats = tables.map(table => {
      interface CountRow {
        count: number;
      }
      const count = db!.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get() as CountRow;
      return { table: table.name, rows: count.count };
    });

    // Get database file size
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'mcp-analyzer.db');
    let databaseSizeBytes = 0;
    let databaseSizeMB = '0.00';

    try {
      const dbStats = fs.statSync(dbPath);
      databaseSizeBytes = dbStats.size;
      databaseSizeMB = (databaseSizeBytes / (1024 * 1024)).toFixed(2);
    } catch (error) {
      console.error('Failed to get database file size:', error);
    }

    return {
      totalServers: stats.total_servers,
      analyzedServers: stats.analyzed_servers,
      introspectedServers: stats.introspected_servers,
      totalAnalyses: stats.total_analyses,
      totalIntrospections: stats.total_introspections,
      databaseSizeBytes,
      databaseSizeMB,
      oldestServer: stats.oldest_server,
      newestServer: stats.newest_server,
      tableStats,
    };
  } catch (error) {
    console.error('Failed to get database analytics:', error);
    return {
      totalServers: 0,
      analyzedServers: 0,
      introspectedServers: 0,
      totalAnalyses: 0,
      totalIntrospections: 0,
      databaseSizeBytes: 0,
      databaseSizeMB: '0.00',
      oldestServer: null,
      newestServer: null,
      tableStats: [],
    };
  }
}

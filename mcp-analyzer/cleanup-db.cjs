const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

// Get the database path
const dbPath = path.join(
  process.env.APPDATA || 
  (os.platform() === 'darwin' ? path.join(os.homedir(), 'Library', 'Application Support') : path.join(os.homedir(), '.config')),
  'mcp-analyzer',
  'mcp-analyzer.db'
);

console.log('Database path:', dbPath);

try {
  const db = new Database(dbPath);
  
  console.log('\n=== Current Database State ===');
  
  // Check servers table
  const servers = db.prepare('SELECT * FROM servers').all();
  console.log(`\nServers table: ${servers.length} rows`);
  servers.forEach(s => {
    console.log(`  - ${s.id}: ${s.name} (${s.source})`);
  });
  
  // Check analyses table
  const analyses = db.prepare('SELECT * FROM analyses').all();
  console.log(`\nAnalyses table: ${analyses.length} rows`);
  
  // Find duplicates by name + source
  console.log('\n=== Finding Duplicates ===');
  const duplicates = db.prepare(`
    SELECT name, source, COUNT(*) as count
    FROM servers
    GROUP BY name, source
    HAVING count > 1
  `).all();
  
  if (duplicates.length > 0) {
    console.log(`Found ${duplicates.length} duplicate groups:`);
    duplicates.forEach(d => {
      console.log(`  - ${d.name} (${d.source}): ${d.count} copies`);
    });
    
    console.log('\n=== Cleaning Up Duplicates ===');
    
    // For each duplicate group, keep only the most recent one
    for (const dup of duplicates) {
      const dupeRows = db.prepare(`
        SELECT id, created_at FROM servers 
        WHERE name = ? AND source = ?
        ORDER BY created_at DESC
      `).all(dup.name, dup.source);
      
      // Keep the first (most recent), delete the rest
      const toDelete = dupeRows.slice(1);
      
      for (const row of toDelete) {
        console.log(`  Deleting: ${row.id} (created: ${row.created_at})`);
        db.prepare('DELETE FROM servers WHERE id = ?').run(row.id);
        db.prepare('DELETE FROM analyses WHERE server_id = ?').run(row.id);
      }
    }
    
    console.log('\n✓ Duplicates removed');
  } else {
    console.log('No duplicates found');
  }
  
  // Clean up orphaned analyses (analyses without matching servers)
  console.log('\n=== Cleaning Orphaned Analyses ===');
  const orphaned = db.prepare(`
    SELECT a.server_id 
    FROM analyses a
    LEFT JOIN servers s ON a.server_id = s.id
    WHERE s.id IS NULL
  `).all();
  
  if (orphaned.length > 0) {
    console.log(`Found ${orphaned.length} orphaned analyses`);
    for (const o of orphaned) {
      console.log(`  Deleting analysis for: ${o.server_id}`);
      db.prepare('DELETE FROM analyses WHERE server_id = ?').run(o.server_id);
    }
    console.log('✓ Orphaned analyses removed');
  } else {
    console.log('No orphaned analyses found');
  }
  
  // Show final state
  console.log('\n=== Final Database State ===');
  const finalServers = db.prepare('SELECT * FROM servers').all();
  const finalAnalyses = db.prepare('SELECT * FROM analyses').all();
  
  console.log(`Servers: ${finalServers.length}`);
  console.log(`Analyses: ${finalAnalyses.length}`);
  
  // Group by source
  const bySource = finalServers.reduce((acc, s) => {
    acc[s.source] = (acc[s.source] || 0) + 1;
    return acc;
  }, {});
  
  console.log('\nServers by source:');
  Object.entries(bySource).forEach(([source, count]) => {
    console.log(`  ${source}: ${count}`);
  });
  
  db.close();
  console.log('\n✓ Database cleanup complete!');
  
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}

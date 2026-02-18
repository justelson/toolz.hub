-- MCP Analyzer Database Cleanup Script
-- This removes duplicate servers and orphaned analyses

-- Show current state
SELECT 'Current servers:' as info;
SELECT COUNT(*) as total_servers FROM servers;

SELECT 'Servers by source:' as info;
SELECT source, COUNT(*) as count FROM servers GROUP BY source;

-- Find duplicates
SELECT 'Duplicate servers (name + source):' as info;
SELECT name, source, COUNT(*) as count
FROM servers
GROUP BY name, source
HAVING count > 1;

-- Delete duplicates, keeping only the most recent
DELETE FROM servers
WHERE id NOT IN (
  SELECT MAX(id)
  FROM servers
  GROUP BY name, source
);

-- Delete orphaned analyses
DELETE FROM analyses
WHERE server_id NOT IN (SELECT id FROM servers);

-- Show final state
SELECT 'After cleanup:' as info;
SELECT COUNT(*) as total_servers FROM servers;

SELECT 'Servers by source:' as info;
SELECT source, COUNT(*) as count FROM servers GROUP BY source;

SELECT 'Total analyses:' as info;
SELECT COUNT(*) as total_analyses FROM analyses;

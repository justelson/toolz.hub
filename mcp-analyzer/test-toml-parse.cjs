const fs = require('fs');

const configData = fs.readFileSync('C:\\Users\\elson\\.codex\\config.toml', 'utf-8');

let mcpServers = {};
const tomlLines = configData.split('\n');
let currentServer = '';
let currentConfig = {};

for (const line of tomlLines) {
  // Match both [mcp_servers.name] and [[mcp_servers.name]]
  const serverMatch = line.match(/\[+mcp_servers\.([^\]]+)\]+/);
  if (serverMatch) {
    if (currentServer && Object.keys(currentConfig).length > 0) {
      mcpServers[currentServer] = currentConfig;
    }
    currentServer = serverMatch[1];
    currentConfig = {};
    console.log(`Found server section: ${currentServer}`);
  } else if (currentServer) {
    const keyMatch = line.match(/^(\w+)\s*=\s*(.+)$/);
    if (keyMatch) {
      const [, key, value] = keyMatch;
      try {
        currentConfig[key] = JSON.parse(value);
        console.log(`  ${key} = ${value} (parsed as JSON)`);
      } catch {
        currentConfig[key] = value.replace(/^["']|["']$/g, '');
        console.log(`  ${key} = ${value} (as string)`);
      }
    }
  }
}

if (currentServer && Object.keys(currentConfig).length > 0) {
  mcpServers[currentServer] = currentConfig;
}

console.log('\n=== Parsed MCP Servers ===');
console.log(JSON.stringify(mcpServers, null, 2));

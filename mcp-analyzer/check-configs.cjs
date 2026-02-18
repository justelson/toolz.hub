const fs = require('fs');
const path = require('path');
const os = require('os');

const MCP_CONFIG_LOCATIONS = {
  // Kiro
  kiro_user: path.join(os.homedir(), '.kiro', 'settings', 'mcp.json'),
  kiro_workspace: path.join(process.cwd(), '.kiro', 'settings', 'mcp.json'),
  
  // Claude Desktop
  claude_desktop_mac: path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
  claude_desktop_windows: path.join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json'),
  
  // Cline (VS Code extension)
  cline_vscode_windows: path.join(process.env.APPDATA || '', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json'),
  
  // VS Code MCP extension
  vscode_mcp_windows: path.join(process.env.APPDATA || '', 'Code', 'User', 'globalStorage', 'modelcontextprotocol.mcp', 'mcp.json'),
  
  // Roo Cline
  roo_cline_windows: path.join(process.env.APPDATA || '', 'Code', 'User', 'globalStorage', 'rooveterinaryinc.roo-cline', 'settings', 'cline_mcp_settings.json'),
  
  // Roo Code (standalone)
  roo_code_windows: path.join(process.env.USERPROFILE || '', '.roo', 'mcp_settings.json'),
  
  // Zed Editor - uses settings.json with context_servers key
  zed_windows: path.join(process.env.APPDATA || '', 'Zed', 'settings.json'),
  
  // Cursor (VS Code fork) - verified paths from online research
  cursor_windows: path.join(process.env.USERPROFILE || '', '.cursor', 'mcp.json'),
  
  // Windsurf (Codeium) - verified paths from online research
  windsurf_windows: path.join(process.env.USERPROFILE || '', '.codeium', 'windsurf', 'mcp_config.json'),
  
  // Continue.dev (VS Code extension) - verified paths from online research
  continue_windows: path.join(process.env.USERPROFILE || '', '.continue', 'config.json'),
  
  // Antigravity IDE - uses mcp_config.json (accessed via UI, but stored in user data)
  antigravity_windows: path.join(process.env.LOCALAPPDATA || process.env.APPDATA || '', 'Antigravity', 'User', 'mcp_config.json'),
  
  // Gemini CLI - uses settings.json with mcpServers key
  gemini_cli_windows: path.join(process.env.USERPROFILE || '', '.gemini', 'settings.json'),
  
  // Codex CLI - uses config.toml
  codex_cli_windows: path.join(process.env.USERPROFILE || '', '.codex', 'config.toml'),
};

console.log('=== Checking MCP Config File Locations ===\n');

let foundCount = 0;
let notFoundCount = 0;

for (const [source, configPath] of Object.entries(MCP_CONFIG_LOCATIONS)) {
  try {
    const stats = fs.statSync(configPath);
    console.log(`✓ FOUND [${source}]`);
    console.log(`  Path: ${configPath}`);
    console.log(`  Size: ${stats.size} bytes\n`);
    foundCount++;
  } catch (error) {
    console.log(`✗ NOT FOUND [${source}]`);
    console.log(`  Path: ${configPath}\n`);
    notFoundCount++;
  }
}

console.log(`\n=== Summary ===`);
console.log(`Found: ${foundCount}`);
console.log(`Not Found: ${notFoundCount}`);
console.log(`Total Checked: ${Object.keys(MCP_CONFIG_LOCATIONS).length}`);

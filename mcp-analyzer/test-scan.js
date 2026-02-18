#!/usr/bin/env node

const { scanMCPServers } = require('./dist/main/mcp-scanner.js');

console.log('Testing MCP Scanner...\n');

const startTime = Date.now();

scanMCPServers()
  .then(servers => {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✓ Scan completed in ${duration}ms\n`);
    console.log(`Found ${servers.length} server(s):\n`);
    
    servers.forEach((server, index) => {
      console.log(`${index + 1}. ${server.name}`);
      console.log(`   Source: ${server.source || 'Unknown'}`);
      console.log(`   Command: ${server.command}`);
      console.log(`   Status: ${server.status}`);
      console.log(`   Config: ${server.configPath}`);
      console.log('');
    });
    
    if (duration > 5000) {
      console.warn(`⚠ Warning: Scan took ${duration}ms (expected <2000ms)`);
    } else {
      console.log(`✓ Performance: ${duration}ms (good!)`);
    }
  })
  .catch(error => {
    console.error('✗ Scan failed:', error);
    process.exit(1);
  });

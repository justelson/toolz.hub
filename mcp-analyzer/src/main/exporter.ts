import { dialog } from 'electron';
import fs from 'fs/promises';
import type { MCPAnalysis, MCPServer } from '../shared/types';

export async function exportData(format: string, data: unknown): Promise<string> {
  const { filePath } = await dialog.showSaveDialog({
    title: 'Export MCP Data',
    defaultPath: `mcp-analysis-${Date.now()}`,
    filters: [
      { name: 'JSON', extensions: ['json'] },
      { name: 'Markdown', extensions: ['md'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (!filePath) {
    throw new Error('Export cancelled');
  }

  let content: string;

  if (format === 'json') {
    content = JSON.stringify(data, null, 2);
  } else if (format === 'markdown') {
    content = convertToMarkdown(data);
  } else {
    // Both formats
    const jsonPath = filePath.replace(/\.[^.]+$/, '.json');
    const mdPath = filePath.replace(/\.[^.]+$/, '.md');
    
    await fs.writeFile(jsonPath, JSON.stringify(data, null, 2), 'utf-8');
    await fs.writeFile(mdPath, convertToMarkdown(data), 'utf-8');
    
    return `Exported to:\n${jsonPath}\n${mdPath}`;
  }

  await fs.writeFile(filePath, content, 'utf-8');
  return `Exported to: ${filePath}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isMCPServer(value: unknown): value is MCPServer {
  if (!isRecord(value)) return false;
  return typeof value.name === 'string'
    && typeof value.command === 'string'
    && Array.isArray(value.args);
}

function isMCPAnalysis(value: unknown): value is MCPAnalysis {
  if (!isRecord(value)) return false;
  return typeof value.summary === 'string'
    && typeof value.purpose === 'string'
    && Array.isArray(value.capabilities)
    && Array.isArray(value.useCases)
    && typeof value.howItWorks === 'string';
}

function convertToMarkdown(data: unknown): string {
  const items = Array.isArray(data) ? data : [data];
  let md = '# MCP Analysis Report\n\n';
  md += `Generated: ${new Date().toLocaleString()}\n\n`;
  md += '---\n\n';

  for (const item of items) {
    if (isMCPServer(item)) {
      // MCP Server
      md += `## ${item.name}\n\n`;
      md += `**Status:** ${item.status}\n\n`;
      md += `**Command:** \`${item.command}\`\n\n`;
      if (item.args?.length) {
        md += `**Args:** ${item.args.join(' ')}\n\n`;
      }
      md += `**Config Path:** ${item.configPath}\n\n`;
    } else if (isMCPAnalysis(item)) {
      // MCP Analysis
      md += `### Analysis\n\n`;
      md += `**Summary:** ${item.summary}\n\n`;
      md += `**Purpose:** ${item.purpose}\n\n`;
      md += `**Capabilities:**\n`;
      for (const cap of item.capabilities || []) {
        md += `- ${cap}\n`;
      }
      md += `\n**Use Cases:**\n`;
      for (const use of item.useCases || []) {
        md += `- ${use}\n`;
      }
      md += `\n**How It Works:** ${item.howItWorks}\n\n`;
    }
    md += '---\n\n';
  }

  return md;
}

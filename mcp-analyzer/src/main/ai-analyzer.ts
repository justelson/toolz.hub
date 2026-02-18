import Groq from 'groq-sdk';
import fs from 'fs/promises';
import path from 'path';
import type { MCPAnalysis, MCPServer } from '../shared/types';

// Try to find and read MCP server documentation
async function findServerDocumentation(server: MCPServer): Promise<string> {
  const docs: string[] = [];
  
  try {
    // Extract potential server paths from command/args
    
    // For Python/uvx servers: extract package name
    if (server.command === 'uvx' || server.command === 'python') {
      const packageArg = server.args[0];
      if (packageArg) {
        docs.push(`Package: ${packageArg}`);
      }
    }
    
    // For Node/npx servers: extract package name
    if (server.command === 'npx' || server.command === 'node') {
      const packageArg = server.args.find(arg => arg.startsWith('@') || !arg.startsWith('-'));
      if (packageArg) {
        docs.push(`Package: ${packageArg}`);
        
        // Try to read from node_modules
        const nodeModulesPath = path.join(process.cwd(), 'node_modules', packageArg);
        try {
          const readmePath = path.join(nodeModulesPath, 'README.md');
          const readme = await fs.readFile(readmePath, 'utf-8');
          // Take first 2000 chars of README
          docs.push(`README:\n${readme.substring(0, 2000)}`);
        } catch {
          // README not found
        }
        
        // Try to read package.json
        try {
          const pkgPath = path.join(nodeModulesPath, 'package.json');
          const pkg = await fs.readFile(pkgPath, 'utf-8');
          const pkgJson = JSON.parse(pkg);
          if (pkgJson.description) {
            docs.push(`Description: ${pkgJson.description}`);
          }
        } catch {
          // package.json not found
        }
      }
    }
    
    // For local file paths in args
    for (const arg of server.args) {
      if (arg.includes('.py') || arg.includes('.js') || arg.includes('.ts')) {
        try {
          // Try to read the file
          const content = await fs.readFile(arg, 'utf-8');
          // Extract docstrings/comments from beginning
          const lines = content.split('\n').slice(0, 50); // First 50 lines
          const docLines = lines.filter(line => 
            line.includes('"""') || 
            line.includes("'''") || 
            line.trim().startsWith('#') ||
            line.trim().startsWith('//') ||
            line.trim().startsWith('/*')
          );
          if (docLines.length > 0) {
            docs.push(`Source documentation:\n${docLines.join('\n')}`);
          }
        } catch {
          // File not readable
        }
      }
    }
  } catch (error) {
    console.error('Error finding server documentation:', error);
  }
  
  return docs.length > 0 ? docs.join('\n\n') : '';
}

export async function analyzeMCPWithGroq(
  serverId: string,
  serverData: string,
  apiKey: string
): Promise<MCPAnalysis> {
  if (!apiKey) {
    throw new Error('Groq API key is required');
  }

  const groq = new Groq({
    apiKey,
  });

  // Parse server data to get actual server object
  const server: MCPServer = JSON.parse(serverData);
  
  // Try to find additional documentation
  const additionalDocs = await findServerDocumentation(server);

  const prompt = `Analyze this MCP (Model Context Protocol) server configuration and provide a comprehensive report.

MCP Server Configuration:
${serverData}

${additionalDocs ? `Additional Documentation Found:\n${additionalDocs}\n` : ''}

Based on the command, arguments, and any available documentation, provide:
1. A brief summary (1-2 sentences) - be specific about what THIS server does
2. The main purpose of this MCP server - what problem does it solve?
3. Key capabilities it provides (list 3-5) - actual features, not generic
4. Common use cases (list 3-5) - real-world scenarios
5. How it works (technical explanation in 2-3 sentences) - implementation details

If this is a known MCP server package (like @modelcontextprotocol/server-*), use your knowledge of that package.

Format your response as JSON with these exact keys:
{
  "summary": "...",
  "purpose": "...",
  "capabilities": ["...", "..."],
  "useCases": ["...", "..."],
  "howItWorks": "..."
}`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are an expert in Model Context Protocol (MCP) servers. You have deep knowledge of common MCP server packages and their capabilities. Analyze configurations and provide accurate, specific insights based on the actual server being used.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    });

    const response = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(response);

    return {
      serverId,
      summary: parsed.summary || 'No summary available',
      purpose: parsed.purpose || 'Purpose not determined',
      capabilities: parsed.capabilities || [],
      useCases: parsed.useCases || [],
      howItWorks: parsed.howItWorks || 'Technical details not available',
      analyzedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Groq API error:', error);
    throw new Error('Failed to analyze MCP with Groq API');
  }
}

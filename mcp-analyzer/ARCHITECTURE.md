# MCP Analyzer - Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     MCP ANALYZER APP                        │
│                    (Electron Desktop)                       │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   RENDERER   │    │     MAIN     │    │   PRELOAD    │
│   (React)    │◄───┤  (Node.js)   │◄───┤  (Bridge)    │
│              │IPC │              │    │              │
└──────────────┘    └──────────────┘    └──────────────┘
        │                   │
        │                   ├─────► MCP Scanner
        │                   │       (File System)
        │                   │
        │                   ├─────► AI Analyzer
        │                   │       (Groq API)
        │                   │
        │                   └─────► Exporter
        │                           (JSON/MD)
        │
        └─────► UI Components
                (Dashboard, Cards, Detail)
```

## Process Architecture

### 1. Main Process (Node.js)
**File:** `src/main/index.ts`

Responsibilities:
- Create BrowserWindow
- Handle IPC communication
- Coordinate backend services
- Manage window controls

Services:
```
main/
├── mcp-scanner.ts    → Detect MCPs
├── ai-analyzer.ts    → Groq API calls
└── exporter.ts       → File exports
```

### 2. Renderer Process (React)
**File:** `src/renderer/App.tsx`

Responsibilities:
- UI rendering
- State management
- User interactions
- Display data

Components:
```
renderer/
├── App.tsx           → Main layout
├── components/
│   ├── Dashboard.tsx → Grid layout
│   ├── MCPCard.tsx   → Server cards
│   └── DetailView.tsx→ Analysis sidebar
└── styles.css        → Global styles
```

### 3. Preload Script (Bridge)
**File:** `src/preload/index.ts`

Responsibilities:
- Expose safe APIs to renderer
- IPC bridge via contextBridge
- Security isolation

APIs:
```typescript
window.electronAPI = {
  scanMCPs()        → Trigger scan
  analyzeMCP()      → AI analysis
  exportData()      → Export files
  windowMinimize()  → Window control
  windowMaximize()  → Window control
  windowClose()     → Window control
}
```

## Data Flow

### MCP Detection Flow
```
User clicks "SCAN MCPS"
    │
    ├─► Renderer: scanMCPs()
    │
    ├─► IPC: 'scan-mcps'
    │
    ├─► Main: scanMCPServers()
    │   │
    │   ├─► Read ~/.kiro/settings/mcp.json
    │   ├─► Read .kiro/settings/mcp.json
    │   ├─► Scan running processes
    │   └─► Check server status
    │
    ├─► Return: MCPServer[]
    │
    └─► Renderer: Update state
```

### AI Analysis Flow
```
User clicks "ANALYZE WITH AI"
    │
    ├─► Renderer: analyzeMCP(server)
    │
    ├─► IPC: 'analyze-mcp'
    │
    ├─► Main: analyzeMCPWithGroq()
    │   │
    │   ├─► Format prompt
    │   ├─► Call Groq API
    │   │   (Llama 3.3 70B)
    │   └─► Parse JSON response
    │
    ├─► Return: MCPAnalysis
    │
    └─► Renderer: Update analyses map
```

### Export Flow
```
User clicks "EXPORT ALL"
    │
    ├─► Renderer: exportData(format, data)
    │
    ├─► IPC: 'export-data'
    │
    ├─► Main: exportData()
    │   │
    │   ├─► Show save dialog
    │   ├─► Convert to format
    │   │   ├─► JSON: stringify
    │   │   └─► MD: convertToMarkdown()
    │   └─► Write to file
    │
    ├─► Return: File path
    │
    └─► Renderer: Show success alert
```

## MCP Scanner Logic

### Detection Strategy
```
1. Config-based Detection
   ├─► ~/.kiro/settings/mcp.json (user)
   └─► .kiro/settings/mcp.json (workspace)

2. Process-based Detection
   ├─► Windows: tasklist /FO CSV
   └─► Unix: ps aux | grep

3. Status Check
   ├─► Match process name
   └─► Return: running/stopped/unknown

4. Merge Results
   └─► Combine config + running
```

### MCP Server Object
```typescript
interface MCPServer {
  id: string              // Unique identifier
  name: string            // Server name
  command: string         // Executable command
  args: string[]          // Command arguments
  env?: Record<...>       // Environment vars
  status: Status          // running/stopped/unknown
  configPath: string      // Config file path
  disabled?: boolean      // Is disabled?
  autoApprove?: string[]  // Auto-approved tools
}
```

## AI Analyzer Logic

### Groq Integration
```
Input: MCPServer data (JSON)
    │
    ├─► Format prompt
    │   ├─► System: "You are MCP expert"
    │   └─► User: "Analyze this MCP..."
    │
    ├─► Call Groq API
    │   ├─► Model: llama-3.3-70b-versatile
    │   ├─► Temperature: 0.3 (focused)
    │   ├─► Max tokens: 1024
    │   └─► Response format: JSON
    │
    └─► Parse response
        ├─► summary
        ├─► purpose
        ├─► capabilities[]
        ├─► useCases[]
        └─► howItWorks
```

### Analysis Object
```typescript
interface MCPAnalysis {
  serverId: string        // Links to MCPServer
  summary: string         // 1-2 sentence overview
  purpose: string         // Main purpose
  capabilities: string[]  // 3-5 key capabilities
  useCases: string[]      // 3-5 use cases
  howItWorks: string      // Technical explanation
  analyzedAt: string      // ISO timestamp
}
```

## State Management

### React State
```typescript
// App.tsx
const [servers, setServers] = useState<MCPServer[]>([])
const [analyses, setAnalyses] = useState<Map<string, MCPAnalysis>>(new Map())
const [loading, setLoading] = useState(false)
const [scanning, setScanning] = useState(false)
```

### State Flow
```
Initial Load
    │
    ├─► scanServers()
    │   └─► setServers([...])
    │
User clicks "ANALYZE"
    │
    ├─► analyzeServer(server)
    │   ├─► setLoading(true)
    │   ├─► Call API
    │   ├─► setAnalyses(new Map(...))
    │   └─► setLoading(false)
    │
User selects card
    │
    └─► setSelectedServer(server)
        └─► DetailView renders
```

## Security Model

### Electron Security
```
BrowserWindow:
  ├─► contextIsolation: true    ✅
  ├─► nodeIntegration: false    ✅
  └─► preload: bridge only      ✅

Preload:
  └─► contextBridge.exposeInMainWorld()
      └─► Only safe APIs exposed
```

### API Security
```
Groq API Key:
  ├─► Stored in .env (not committed)
  ├─► Accessed only in main process
  └─► Never exposed to renderer
```

## Build Process

### Development
```
npm run dev
    │
    ├─► Vite dev server (port 5173)
    │   └─► Hot reload enabled
    │
    └─► Electron app
        ├─► Loads from dev server
        └─► DevTools open
```

### Production
```
npm run build
    │
    ├─► TypeScript compile
    ├─► Vite build
    │   ├─► Bundle renderer
    │   └─► Optimize assets
    │
    └─► Electron builder
        ├─► Package app
        └─► Create installer
            ├─► Windows: .exe
            ├─► macOS: .dmg
            └─► Linux: .AppImage
```

## Design System

### Color Palette
```css
/* Light Mode */
--background: rgb(232, 235, 237)
--foreground: rgb(51, 51, 51)
--primary: rgb(224, 93, 56)      /* Orange */
--border: rgb(220, 223, 226)

/* Dark Mode */
--background: rgb(28, 36, 51)    /* Dark blue-gray */
--foreground: rgb(229, 229, 229)
--primary: rgb(224, 93, 56)      /* Orange */
--border: rgb(61, 67, 84)
```

### Typography
```
Headings: Source Serif 4 (serif)
Body: Inter (sans-serif)
Code: JetBrains Mono (monospace)
```

### Design Principles
- Sharp corners (0.125rem - 0.5rem)
- Bold borders (2px solid)
- High contrast
- Minimal shadows
- Status indicators with icons

## Performance Considerations

### Optimization
```
✅ React.memo for cards (prevent re-renders)
✅ Map for analyses (O(1) lookup)
✅ Lazy loading for heavy components
✅ Debounced search (if implemented)
✅ Virtualized lists (if >100 servers)
```

### Bottlenecks
```
⚠️ Groq API calls (2-3s per MCP)
   → Solution: Parallel analysis (future)

⚠️ Process scanning (slow on Windows)
   → Solution: Cache results, refresh on demand

⚠️ Large config files
   → Solution: Stream parsing (future)
```

## Future Enhancements

### Planned Features
```
1. Real-time monitoring
   └─► Watch MCP status changes

2. Batch analysis
   └─► Analyze all MCPs at once

3. MCP testing
   └─► Test tool invocations

4. History tracking
   └─► Track analysis over time

5. Custom prompts
   └─► User-defined analysis prompts
```

## Tech Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Desktop | Electron 33 | Cross-platform app |
| Build | Vite 5 | Fast bundling |
| UI | React 18 | Component framework |
| Types | TypeScript 5 | Type safety |
| Styles | Tailwind CSS 3 | Utility-first CSS |
| AI | Groq SDK | LLM inference |
| Icons | Lucide React | Icon library |

## Skills Applied

From `.ai-powers/.agent/skills/`:
- ✅ `app-builder` - Electron template
- ✅ `typescript-expert` - Type system
- ✅ `react-patterns` - Hooks, composition
- ✅ `clean-code` - SRP, DRY, KISS
- ✅ `frontend-design` - Brutalist UI
- ✅ `mcp-builder` - MCP protocol
- ✅ `nodejs-best-practices` - Main process
- ✅ `architecture` - System design

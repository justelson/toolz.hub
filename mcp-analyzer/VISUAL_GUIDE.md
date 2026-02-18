# MCP Analyzer - Visual Guide

## 🎨 UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  ■  MCP ANALYZER                              [_] [□] [×]       │ ← Title Bar
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  MCP ANALYZER                                                    │ ← Header
│  System-wide Model Context Protocol server detection            │
│                                                                  │
│  [🔄 SCAN MCPS]  [💾 EXPORT ALL]                                │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  DETECTED SERVERS                                    [3 FOUND]  │
│                                                                  │
│  ┌─────────────────────────────────┐  ┌──────────────────────┐ │
│  │ aws-docs              [⚡RUNNING]│  │ DETAIL VIEW          │ │
│  │ uvx awslabs.aws-doc...          │  │                      │ │
│  │                                 │  │ SERVER INFO          │ │
│  │ [🧠 ANALYZE WITH AI]            │  │ NAME: aws-docs       │ │
│  └─────────────────────────────────┘  │ COMMAND: uvx ...     │ │
│                                        │                      │ │
│  ┌─────────────────────────────────┐  │ PURPOSE              │ │
│  │ context7              [⚡RUNNING]│  │ Provides AWS docs... │ │
│  │ uvx context7-mcp-server         │  │                      │ │
│  │                                 │  │ CAPABILITIES         │ │
│  │ AI-powered documentation...     │  │ ▪ Search AWS docs    │ │
│  │ [3 CAPABILITIES] [5 USE CASES]  │  │ ▪ Code examples      │ │
│  └─────────────────────────────────┘  │ ▪ Best practices     │ │
│                                        │                      │ │
│  ┌─────────────────────────────────┐  │ USE CASES            │ │
│  │ figma                 [⚠UNKNOWN]│  │ ▪ Learning AWS       │ │
│  │ npx figma-mcp-server            │  │ ▪ Quick reference    │ │
│  │                                 │  │ ▪ Code generation    │ │
│  │ [🧠 ANALYZE WITH AI]            │  │                      │ │
│  └─────────────────────────────────┘  └──────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 🎨 Color Scheme

### Light Mode (Not Primary)
```
Background:  ░░░░░░  rgb(232, 235, 237)  - Light gray
Foreground:  ██████  rgb(51, 51, 51)     - Dark gray
Primary:     ██████  rgb(224, 93, 56)    - Orange
Border:      ──────  rgb(220, 223, 226)  - Light border
```

### Dark Mode (Primary)
```
Background:  ██████  rgb(28, 36, 51)     - Dark blue-gray
Foreground:  ░░░░░░  rgb(229, 229, 229)  - Light gray
Primary:     ██████  rgb(224, 93, 56)    - Orange
Border:      ──────  rgb(61, 67, 84)     - Dark border
Card:        ██████  rgb(42, 48, 64)     - Card background
```

## 🎯 Status Indicators

```
⚡ RUNNING   - Green  - Server is active
⚠ UNKNOWN   - Yellow - Status unclear
🔴 STOPPED  - Red    - Server not running
```

## 📦 Component Breakdown

### 1. Title Bar
```
┌─────────────────────────────────────────────┐
│  ■  MCP ANALYZER          [_] [□] [×]       │
└─────────────────────────────────────────────┘
     │                        │   │   │
     └─ Logo                  │   │   └─ Close
                              │   └───── Maximize
                              └───────── Minimize
```

### 2. Header
```
┌─────────────────────────────────────────────┐
│  MCP ANALYZER                                │
│  System-wide Model Context Protocol...      │
│                                              │
│  [🔄 SCAN MCPS]  [💾 EXPORT ALL]            │
└─────────────────────────────────────────────┘
     │                │
     └─ Scan button   └─ Export button
```

### 3. Server Card
```
┌─────────────────────────────────┐
│ aws-docs              [⚡RUNNING]│ ← Name + Status
│ uvx awslabs.aws-doc...          │ ← Command
│                                 │
│ [🧠 ANALYZE WITH AI]            │ ← Action button
└─────────────────────────────────┘
```

### 4. Server Card (Analyzed)
```
┌─────────────────────────────────┐
│ context7              [⚡RUNNING]│
│ uvx context7-mcp-server         │
│                                 │
│ AI-powered documentation...     │ ← Summary
│ [3 CAPABILITIES] [5 USE CASES]  │ ← Badges
└─────────────────────────────────┘
```

### 5. Detail View
```
┌──────────────────────┐
│ DETAIL VIEW          │ ← Header
├──────────────────────┤
│ 📄 SERVER INFO       │
│ NAME: aws-docs       │
│ COMMAND: uvx ...     │
├──────────────────────┤
│ ⚙️ PURPOSE           │
│ Provides AWS docs... │
├──────────────────────┤
│ 🔧 CAPABILITIES      │
│ ▪ Search AWS docs    │
│ ▪ Code examples      │
├──────────────────────┤
│ 💡 USE CASES         │
│ ▪ Learning AWS       │
│ ▪ Quick reference    │
└──────────────────────┘
```

## 🎭 Typography Hierarchy

```
H1 (App Title)
  MCP ANALYZER
  ↓ Source Serif 4, 36px, Bold

H2 (Section Title)
  DETECTED SERVERS
  ↓ Source Serif 4, 24px, Bold

H3 (Card Title)
  aws-docs
  ↓ JetBrains Mono, 18px, Bold

Body (Description)
  System-wide Model Context Protocol...
  ↓ Inter, 14px, Regular

Code (Command)
  uvx awslabs.aws-documentation-mcp-server
  ↓ JetBrains Mono, 12px, Regular

Label (Status)
  RUNNING
  ↓ JetBrains Mono, 10px, Bold, Uppercase
```

## 🎨 Design Tokens

### Spacing
```
xs:  4px   - Icon gaps
sm:  8px   - Tight spacing
md:  16px  - Default spacing
lg:  24px  - Section spacing
xl:  32px  - Large gaps
```

### Border Radius
```
sm:  2px   - Minimal rounding
md:  4px   - Default
lg:  8px   - Cards
```

### Borders
```
All borders: 2px solid
Color: var(--border)
Style: Sharp, geometric
```

### Shadows
```
None - Brutalist design uses borders instead
```

## 🎬 Animations

### Scan Button
```
[🔄 SCAN MCPS]
     ↓ Click
[🔄 SCANNING...] ← Spinner rotates
     ↓ Complete
[🔄 SCAN MCPS]
```

### Card Selection
```
┌─────────────────┐
│ aws-docs        │ ← Default (border-border)
└─────────────────┘
     ↓ Click
┌═════════════════┐
│ aws-docs        │ ← Selected (border-primary)
└═════════════════┘
```

### Analysis Loading
```
[🧠 ANALYZE WITH AI]
     ↓ Click
[🧠 ANALYZING...]
     ↓ Complete
AI-powered documentation...
[3 CAPABILITIES] [5 USE CASES]
```

## 📱 Responsive Behavior

### Desktop (1400px+)
```
┌─────────────────────────────────────┐
│  [Server Cards]  │  [Detail View]   │
│  (2 columns)     │  (1 column)      │
└─────────────────────────────────────┘
```

### Tablet (768px - 1399px)
```
┌─────────────────────────────────────┐
│  [Server Cards]                     │
│  (1 column)                         │
│                                     │
│  [Detail View]                      │
│  (full width)                       │
└─────────────────────────────────────┘
```

### Mobile (<768px)
```
┌──────────────┐
│ [Cards]      │
│ (stacked)    │
│              │
│ [Detail]     │
│ (full width) │
└──────────────┘
```

## 🎨 Icon Usage

### Status Icons
```
⚡ Zap        - Running (green)
🔴 ZapOff    - Stopped (red)
❓ HelpCircle - Unknown (yellow)
```

### Action Icons
```
🔄 RefreshCw  - Scan/Refresh
💾 Download   - Export
🧠 Brain      - AI Analysis
📄 FileCode   - Server Info
🔧 Wrench     - Capabilities
💡 Lightbulb  - Use Cases
⚙️ Cog        - Purpose
```

### Window Controls
```
[_] Minimize2  - Minimize window
[□] Maximize2  - Maximize window
[×] X          - Close window
```

## 🎯 Interactive States

### Button States
```
Default:  [SCAN MCPS]
          ↓
Hover:    [SCAN MCPS] ← bg-primary/90
          ↓
Active:   [SCAN MCPS] ← Pressed
          ↓
Disabled: [SCAN MCPS] ← opacity-50
```

### Card States
```
Default:  border-border
          ↓
Hover:    border-primary/50
          ↓
Selected: border-primary
```

## 📊 Data Visualization

### Status Distribution
```
Running:  ████████░░  80%
Stopped:  ██░░░░░░░░  20%
Unknown:  ░░░░░░░░░░   0%
```

### Analysis Progress
```
Not Analyzed:  ████████░░  80%
Analyzed:      ██░░░░░░░░  20%
```

## 🎨 Export Preview

### JSON Format
```json
{
  "servers": [
    {
      "id": "aws-docs-...",
      "name": "aws-docs",
      "status": "running",
      ...
    }
  ],
  "analyses": [
    {
      "serverId": "aws-docs-...",
      "summary": "...",
      "capabilities": [...],
      ...
    }
  ]
}
```

### Markdown Format
```markdown
# MCP Analysis Report

Generated: 2/10/2026, 3:45 PM

---

## aws-docs

**Status:** running
**Command:** `uvx awslabs.aws-documentation-mcp-server`

### Analysis
**Summary:** Provides AWS documentation...

**Capabilities:**
- Search AWS documentation
- Retrieve code examples
- Access best practices

**Use Cases:**
- Learning AWS services
- Quick reference lookup
- Code generation assistance
```

## 🎯 User Flow

```
1. Launch App
   ↓
2. Click "SCAN MCPS"
   ↓
3. View Detected Servers
   ↓
4. Click "ANALYZE WITH AI" on a card
   ↓
5. Wait 2-3 seconds
   ↓
6. View Analysis Summary
   ↓
7. Click Card to See Details
   ↓
8. Click "EXPORT ALL" to Save
   ↓
9. Choose Format (JSON/MD/Both)
   ↓
10. Save to File
```

## 🎨 Design Philosophy

### Brutalism Principles
✅ **Raw & Honest** - No unnecessary decoration  
✅ **Functional** - Every element serves a purpose  
✅ **Bold** - Strong visual hierarchy  
✅ **Geometric** - Sharp edges, clear structure  
✅ **High Contrast** - Easy to read  

### Anti-Patterns Avoided
❌ Rounded corners everywhere  
❌ Soft shadows  
❌ Gradients  
❌ Glassmorphism  
❌ Mesh backgrounds  
❌ Purple color scheme  

---

**Design Status**: ✅ Brutalist, Sharp, High-Contrast, Orange Primary

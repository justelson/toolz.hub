# MCP Analyzer - Features

## Overview
Desktop application for detecting and analyzing MCP (Model Context Protocol) servers system-wide using AI-powered analysis.

## Key Features

### 1. Multi-IDE Detection
Automatically detects MCP servers from:
- **Kiro** (User & Workspace configs)
- **Claude Desktop** (Mac & Windows)
- **Cline** (VS Code extension)
- **Roo Code**
- **VS Code MCP**
- **Running Processes**

### 2. View Modes
Toggle between two display modes:
- **Grid View**: Card-based layout with detailed information
- **Table View**: Compact table format for quick scanning

### 3. Source Filtering
Filter servers by their source application using the left sidebar.

### 4. AI-Powered Analysis
Analyze MCP servers using Groq API (Llama 3.3 70B) to get:
- Summary and purpose
- Key capabilities
- Common use cases
- Technical explanation

### 5. Smart Caching
- Instant load with LocalStorage caching
- Optimistic updates for better UX
- Performance metrics (scan latency, boot time)

### 6. Export Functionality
Export server data and analyses in:
- JSON format
- Markdown format
- Both formats

### 7. Settings Management
- Secure API key storage (browser LocalStorage only)
- Easy configuration through settings modal
- No server-side storage

### 8. Keyboard Shortcuts
- `Ctrl+R` - Scan for MCP servers
- `Ctrl+E` - Export data
- `F5` - Refresh scan

### 9. Toast Notifications
Real-time feedback for all major actions:
- Scan completion
- Analysis results
- Export status
- Error messages

### 10. Brutalist Design
- Sharp edges and high contrast
- Orange primary color (rgb(224, 93, 56))
- Dark mode optimized
- Custom frameless window with geometric controls

## Setup

1. Get your Groq API key from [console.groq.com/keys](https://console.groq.com/keys)
2. Click the **SETTINGS** button in the app
3. Enter your API key
4. Click **SAVE**

Your API key is stored locally and sent directly to Groq - never stored on any server.

## Usage

1. Click **SCAN MCPS** to detect servers
2. Use the source filter sidebar to filter by IDE/app
3. Toggle between Grid/Table view using the view buttons
4. Click **ANALYZE WITH AI** on any server to get AI insights
5. Click on a server card to view details in the right panel
6. Use **EXPORT ALL** to save your data

## Technical Stack

- **Electron** - Desktop framework
- **React** - UI framework
- **Vite** - Build tool
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Groq SDK** - AI analysis
- **Lucide React** - Icons

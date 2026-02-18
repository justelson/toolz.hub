# 🚀 Quick Start - MCP Analyzer

## 3-Step Setup

### 1️⃣ Install
```bash
cd mcp-analyzer
npm install
```

### 2️⃣ Configure Groq API
```bash
# Copy example env file
cp .env.example .env

# Edit .env and add your Groq API key
# Get free key at: https://console.groq.com
```

Your `.env` should look like:
```
GROQ_API_KEY=gsk_your_actual_key_here
```

### 3️⃣ Run
```bash
npm run dev
```

That's it! The app will open automatically.

---

## First Use

1. **Click "SCAN MCPS"** - Detects all MCP servers on your system
2. **Click "ANALYZE WITH AI"** on any server card - AI analyzes the MCP
3. **Click a card** - View detailed analysis in sidebar
4. **Click "EXPORT ALL"** - Save data as JSON/Markdown

---

## What Gets Detected?

✅ Kiro MCP configs (`~/.kiro/settings/mcp.json`)  
✅ Workspace MCP configs (`.kiro/settings/mcp.json`)  
✅ Running MCP processes (uvx, mcp-server, npx mcp)  
✅ Status: running/stopped/unknown  

---

## Features

🔍 **System-wide MCP detection**  
🤖 **AI-powered analysis** (Groq Llama 3.3 70B)  
📊 **Brutalist dashboard** (sharp edges, high contrast)  
💾 **Export to JSON/Markdown**  
⚡ **Real-time status indicators**  

---

## Troubleshooting

**No MCPs detected?**
- Check if `~/.kiro/settings/mcp.json` exists
- Verify MCP servers are actually running

**AI analysis fails?**
- Check Groq API key in `.env`
- Verify internet connection
- Check API quota at console.groq.com

**App won't start?**
```bash
# Clear and reinstall
rm -rf node_modules
npm install
npm run dev
```

---

## Next Steps

📖 Read [SETUP.md](SETUP.md) for detailed documentation  
🏗️ Read [README.md](README.md) for architecture details  
🎨 Customize colors in `src/renderer/styles.css`  

---

**Built with:** Electron + Vite + React + TypeScript + Tailwind + Groq

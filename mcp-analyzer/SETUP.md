# MCP Analyzer - Setup Instructions

## Installation

### 1. Install Dependencies
```bash
npm install
```

This will automatically:
- Install all Node.js dependencies
- Install Electron app dependencies
- Rebuild better-sqlite3 for Electron

### 2. If Native Module Errors Occur

If you see errors like "NODE_MODULE_VERSION mismatch", run:

```bash
npm run rebuild
```

Or manually:
```bash
npx electron-rebuild -f -w better-sqlite3
```

### 3. Start Development Server
```bash
npm run dev
```

## Troubleshooting

### Database Module Error
**Error**: `The module 'better_sqlite3.node' was compiled against a different Node.js version`

**Solution**:
1. Delete `node_modules` folder
2. Run `npm install` again
3. If still failing, run `npm run rebuild`

### Windows-Specific Issues
- Ensure you have Visual Studio Build Tools installed
- Install from: https://visualstudio.microsoft.com/downloads/
- Select "Desktop development with C++" workload

### macOS-Specific Issues
- Ensure Xcode Command Line Tools are installed:
  ```bash
  xcode-select --install
  ```

### Linux-Specific Issues
- Install build essentials:
  ```bash
  sudo apt-get install build-essential
  ```

## Manual Rebuild

If automatic rebuild fails, you can manually rebuild:

```bash
# Install electron-rebuild if not already installed
npm install --save-dev electron-rebuild

# Rebuild all native modules
npx electron-rebuild

# Or rebuild only better-sqlite3
npx electron-rebuild -f -w better-sqlite3
```

## Verifying Installation

After installation, the app should:
1. Start without errors
2. Show "Database initialized at: [path]" in console
3. Allow scanning for MCP servers
4. Save analysis results to database

If you see "Database not initialized" warnings, the native module rebuild failed.

## Alternative: Run Without Database

The app will work without the database (no caching), but you'll need to:
1. Comment out the database import in `src/main/index.ts`
2. Remove database-related code
3. Restart the app

This is not recommended as you'll lose the cost-saving caching features.

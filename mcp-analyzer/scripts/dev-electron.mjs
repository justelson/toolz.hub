import { createServer } from 'vite';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const configFile = path.resolve(root, 'vite.config.ts');

const envPortRaw = process.env.VITE_PORT || process.env.PORT || '';
const envPort = Number(envPortRaw);
const server = await createServer({
  root,
  configFile,
  server: Number.isFinite(envPort) && envPort > 0 ? { port: envPort } : undefined,
});

await server.listen();

const address = server.httpServer?.address();
const port = typeof address === 'object' && address ? address.port : server.config.server.port;
const url = `http://localhost:${port}`;
const env = {
  ...process.env,
  NODE_ENV: 'development',
  VITE_DEV_SERVER_URL: url,
  VITE_PORT: String(port),
};

const electronBinary = process.platform === 'win32'
  ? path.resolve(root, 'node_modules', '.bin', 'electron.cmd')
  : path.resolve(root, 'node_modules', '.bin', 'electron');

let electronCmd = electronBinary;
let electronArgs = ['.'];

if (!fs.existsSync(electronBinary)) {
  electronCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  electronArgs = ['electron', '.'];
}

const useCmdShim = process.platform === 'win32';
const spawnCmd = useCmdShim ? 'cmd.exe' : electronCmd;
const spawnArgs = useCmdShim ? ['/c', electronCmd, ...electronArgs] : electronArgs;

const electron = spawn(spawnCmd, spawnArgs, {
  cwd: root,
  stdio: 'inherit',
  env,
});

const shutdown = async (code = 0) => {
  try {
    await server.close();
  } catch {
    // ignore
  }
  process.exit(code);
};

electron.on('exit', (code) => {
  shutdown(code ?? 0);
});

electron.on('error', (err) => {
  console.error('[dev] Electron failed to start:', err);
  shutdown(1);
});

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

console.log(`[dev] Vite dev server running at ${url}`);

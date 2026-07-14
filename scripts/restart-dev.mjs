#!/usr/bin/env node
import { spawn, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const PORT = 5176;
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function killPort(port) {
  try {
    const out = execSync(`lsof -ti :${port}`, { encoding: 'utf8' }).trim();
    if (!out) return;
    for (const pid of out.split('\n').filter(Boolean)) {
      try {
        process.kill(Number(pid), 'SIGTERM');
      } catch {
        // already gone
      }
    }
  } catch {
    // port free
  }
}

killPort(PORT);
// brief pause so the port is released
Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 400);

const child = spawn('npm', ['run', 'dev'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, FORCE_COLOR: '1' }
});

child.on('exit', (code) => process.exit(code ?? 0));

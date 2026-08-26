import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const app = join(root, 'app');
const children = [];

function run(name, command, args, cwd) {
  const child = spawn(command, args, { cwd, shell: process.platform === 'win32' });
  const tag = `[${name}]`;

  const relay = (stream, to) => {
    stream.on('data', (chunk) => {
      for (const line of chunk.toString().split('\n')) {
        if (line.trim() !== '') to.write(`${tag} ${line}\n`);
      }
    });
  };

  relay(child.stdout, process.stdout);
  relay(child.stderr, process.stderr);

  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      process.stderr.write(`${tag} exited with ${code}\n`);
    }
    shutdown();
  });

  children.push(child);
}

let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) child.kill('SIGTERM');
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

run('stub', process.execPath, [join(root, 'stub', 'server.mjs')], root);

if (existsSync(join(app, 'package.json'))) {
  run('app', 'npm', ['start'], app);
} else {
  console.log('');
  console.log('  No app/ yet, so only the stub is running.');
  console.log('  Create your Angular application in app/ and this will start both:');
  console.log('');
  console.log('    npx @angular/cli@20 new app --style=css --ssr=false');
  console.log('');
  console.log('  Or restructure the repository however you like and rewrite this file.');
  console.log('');
}

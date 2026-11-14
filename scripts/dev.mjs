import { spawn } from 'node:child_process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const processes = [
  spawn(npmCommand, ['run', 'dev:api'], { stdio: 'inherit', shell: process.platform === 'win32' }),
  spawn(npmCommand, ['run', 'dev:web'], { stdio: 'inherit', shell: process.platform === 'win32' }),
];

let shuttingDown = false;
function stopAll() {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of processes) {
    if (!child.killed) child.kill('SIGTERM');
  }
}
for (const child of processes) {
  child.on('error', (error) => {
    console.error('Unable to start Matjark development process:', error);
    stopAll();
    process.exitCode = 1;
  });
  child.on('exit', (code) => {
    if (!shuttingDown && code !== 0) {
      console.error('A Matjark development process stopped unexpectedly.');
      stopAll();
      process.exitCode = code || 1;
    }
  });
}
process.on('SIGINT', stopAll);
process.on('SIGTERM', stopAll);

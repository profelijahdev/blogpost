const { spawn } = require('child_process');
const http = require('http');

// Start Next.js server
const server = spawn('node', ['node_modules/.bin/next', 'start', '-p', '3000'], {
  cwd: '/home/z/my-project',
  stdio: 'pipe',
  detached: false,
});

server.stdout.on('data', (data) => {
  process.stdout.write(data);
});

server.stderr.on('data', (data) => {
  process.stderr.write(data);
});

server.on('exit', (code) => {
  console.log('Server exited with code:', code);
  process.exit(code || 0);
});

// Wait for server to be ready, then start keep-alive
function waitForServer() {
  return new Promise((resolve) => {
    const check = () => {
      http.get('http://localhost:3000', (res) => {
        if (res.statusCode === 200) {
          console.log('Server is ready!');
          resolve();
        } else {
          setTimeout(check, 500);
        }
      }).on('error', () => setTimeout(check, 500));
    };
    setTimeout(check, 2000);
  });
}

async function main() {
  await waitForServer();
  
  // Keep-alive: ping every 5 seconds
  setInterval(() => {
    http.get('http://localhost:3000', () => {}).on('error', () => {});
  }, 5000);
  
  console.log('Keep-alive started. Server will stay running.');
}

main();

// Keep this process alive
process.stdin.resume();

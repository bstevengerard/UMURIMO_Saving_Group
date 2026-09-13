const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const TEST_BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';

function waitForServer(url, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function check() {
      http.get(url, (res) => {
        if (res.statusCode === 200) resolve();
        else retry();
      }).on('error', retry);
    }
    function retry() {
      if (Date.now() - start > timeout) {
        reject(new Error('Server did not start in time'));
      } else {
        setTimeout(check, 500);
      }
    }
    check();
  });
}

async function main() {
  const server = spawn('node', [path.join(__dirname, 'server.js')], {
    env: { ...process.env, NODE_ENV: 'test' },
    stdio: 'inherit',
    shell: true
  });

  try {
    await waitForServer(TEST_BASE_URL + '/health');

    const tests = spawn('node', [path.join(__dirname, 'tests/run.js')], {
      env: { ...process.env, TEST_BASE_URL },
      stdio: 'inherit',
      shell: true
    });

    await new Promise((resolve, reject) => {
      tests.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error('Tests failed'));
      });
    });
  } finally {
    server.kill();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

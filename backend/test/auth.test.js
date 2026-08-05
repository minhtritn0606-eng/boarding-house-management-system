const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const app = require('../src/app');

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const address = server.address();
      resolve({ server, port: address.port });
    });
  });
}

function request(server, path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: server.address().port,
        path,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, body: data ? JSON.parse(data) : null });
        });
      }
    );

    req.on('error', reject);
    req.write(options.body ? JSON.stringify(options.body) : '');
    req.end();
  });
}

test('register and login return a JWT token', async () => {
  const { server } = await startServer();

  try {
    const registerResponse = await request(server, '/api/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Nguyen Van A',
        email: 'a@example.com',
        password: 'password123',
        role: 'tenant',
      },
    });

    assert.equal(registerResponse.statusCode, 201);
    assert.ok(registerResponse.body.user);
    assert.ok(registerResponse.body.token);

    const loginResponse = await request(server, '/api/auth/login', {
      method: 'POST',
      body: {
        email: 'a@example.com',
        password: 'password123',
      },
    });

    assert.equal(loginResponse.statusCode, 200);
    assert.ok(loginResponse.body.token);
    assert.equal(loginResponse.body.user.email, 'a@example.com');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

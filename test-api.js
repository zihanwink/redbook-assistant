const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/register',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => console.log('status:', res.statusCode, 'body:', d));
});
req.on('error', e => console.error('error:', e.message));
req.write(JSON.stringify({ username: 'test3', password: '123456' }));
req.end();

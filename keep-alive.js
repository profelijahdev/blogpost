const http = require('http');
setInterval(() => {
  http.get('http://localhost:3000', () => {}).on('error', () => {});
}, 8000);

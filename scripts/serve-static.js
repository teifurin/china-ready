'use strict';
/**
 * Serves the static sample (docs/demo by default) as plain files, the way GitHub Pages would: no API, no flyai.
 *   node scripts/serve-static.js [dir]      PORT defaults to 8790
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const DIR = path.resolve(process.argv[2] || path.join(__dirname, '..', 'docs', 'demo'));
const PORT = Number(process.env.PORT || 8790);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.txt': 'text/plain; charset=utf-8' };

http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
  catch (_) { res.writeHead(400); return res.end('invalid request URL'); }
  let p = path.normalize(pathname).replace(/^([/\\])+/, '');
  if (!p || p.endsWith('/') || p.endsWith('\\')) p += 'index.html';
  const file = path.join(DIR, p);
  if (!file.startsWith(DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`static sample: http://localhost:${PORT}/  (${DIR})`));

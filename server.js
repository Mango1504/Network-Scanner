// Express backend for authorized Nmap scans.
const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const net = require('net');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

// The browser client is served by this same origin. Keep cross-origin API access
// disabled unless an explicit development origin is configured.
const allowedOrigin = process.env.ALLOWED_ORIGIN;
app.use((req, res, next) => {
  if (allowedOrigin && req.headers.origin === allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Vary', 'Origin');
  }
  next();
});

app.use(express.json({ limit: '16kb', strict: true }));
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; object-src 'none'; connect-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'");
  if (process.env.NODE_ENV === 'production') res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

const scanAttempts = new Map();
function scanRateLimit(req, res, next) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const maxAttempts = 8;
  const key = req.ip || 'unknown';
  const recent = (scanAttempts.get(key) || []).filter(time => now - time < windowMs);
  if (recent.length >= maxAttempts) {
    res.setHeader('Retry-After', '600');
    return res.status(429).json({ error: 'Too many scan requests. Please wait and try again.' });
  }
  recent.push(now);
  scanAttempts.set(key, recent);
  next();
}

const frontendDist = path.join(__dirname, 'frontend-dist');
app.use(express.static(frontendDist));

function isSafeTarget(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 200 && /^[a-zA-Z0-9.\-:/]+$/.test(value);
}

function isSafePortSpec(value) {
  return typeof value === 'string' && value.length <= 100 && /^[0-9,\- ]+$/.test(value);
}

function isBlockedTarget(value) {
  const hostname = value.split('/')[0].toLowerCase().replace(/[\[\]]/g, '');
  if (['localhost', 'localhost.localdomain', 'metadata.google.internal'].includes(hostname) || hostname.endsWith('.local')) return true;
  const ip = net.isIP(hostname);
  if (ip === 4) {
    const octets = hostname.split('.').map(Number);
    return octets[0] === 0 || octets[0] === 10 || octets[0] === 127 || octets[0] === 169 && octets[1] === 254 || octets[0] === 192 && octets[1] === 168 || octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31 || octets[0] >= 224;
  }
  if (ip === 6) return hostname === '::1' || hostname.startsWith('fc') || hostname.startsWith('fd') || hostname.startsWith('fe80');
  return false;
}

function buildNmapArgs({ type = 'quick', ports = '', sv = true, os = false, target }) {
  const args = ['-Pn', '-sT'];

  if (type === 'full') {
    args.push('-p', '1-65535');
  } else if (type === 'custom') {
    args.push('-p', ports || '1-1000');
  } else {
    args.push('--top-ports', '100');
  }

  if (sv) args.push('-sV');
  if (os) args.push('-O');
  args.push('--max-retries', '2', '--host-timeout', '10m', target);
  return args;
}

app.post('/api/scan', scanRateLimit, (req, res) => {
  const { target, type = 'quick', ports = '', sv = true, os = false, authorized = false } = req.body || {};

  if (!isSafeTarget(target)) {
    return res.status(400).json({ error: 'Invalid target. Use a hostname, IP address, or CIDR range.' });
  }
  if (isBlockedTarget(target)) {
    return res.status(400).json({ error: 'Private, local, and metadata targets are not available from this public scanner.' });
  }
  if (authorized !== true) {
    return res.status(403).json({ error: 'Explicit authorization is required before scanning.' });
  }
  if (!['quick', 'full', 'custom'].includes(type)) {
    return res.status(400).json({ error: 'Invalid scan type.' });
  }
  if (type === 'custom' && !isSafePortSpec(ports)) {
    return res.status(400).json({ error: 'Invalid port list. Use values such as 22,80,443 or 1-1000.' });
  }

  const args = buildNmapArgs({ type, ports, sv: Boolean(sv), os: Boolean(os), target });
  const nmap = spawn('nmap', args, { shell: false });
  let stdout = '';
  let stderr = '';
  let responded = false;

  const sendError = (status, message) => {
    if (!responded) {
      responded = true;
      res.status(status).json({ error: message });
    }
  };

  nmap.stdout.on('data', chunk => { stdout += chunk.toString(); });
  nmap.stderr.on('data', chunk => { stderr += chunk.toString(); });
  nmap.on('error', () => {
    sendError(503, 'The scan service is temporarily unavailable.');
  });
  nmap.on('close', code => {
    if (responded) return;

    const raw = stdout.split(/\r?\n/);
    const parsed = raw.flatMap(line => {
      // Nmap indents port rows, so allow leading whitespace.
      const match = line.match(/^\s*(\d+)\/(tcp|udp)\s+(\S+)(?:\s+(.*))?$/);
      if (!match) return [];
      return [{
        port: Number(match[1]),
        proto: match[2],
        state: match[3],
        info: (match[4] || '').trim()
      }];
    });

    if (code !== 0) {
      return sendError(502, 'The scan could not be completed. Check the target and try again later.');
    }

    responded = true;
    res.json({ code, raw, parsed, stderr: stderr.trim() });
  });
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(frontendDist, 'index.html'));
});

const port = Number(process.env.PORT) || 5000;
app.listen(port, '0.0.0.0', () => console.log('Backend listening on ' + port));

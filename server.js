// Express backend for authorized Nmap scans.
const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const frontendDist = path.join(__dirname, 'frontend-dist');
app.use(express.static(frontendDist));

function isSafeTarget(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 200 && /^[a-zA-Z0-9.\-:/]+$/.test(value);
}

function isSafePortSpec(value) {
  return typeof value === 'string' && value.length <= 100 && /^[0-9,\- ]+$/.test(value);
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

app.post('/api/scan', (req, res) => {
  const { target, type = 'quick', ports = '', sv = true, os = false } = req.body || {};

  if (!isSafeTarget(target)) {
    return res.status(400).json({ error: 'Invalid target. Use a hostname, IP address, or CIDR range.' });
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
  nmap.on('error', error => {
    sendError(503, 'Unable to start Nmap: ' + error.message + '. Make sure Nmap is installed and available on PATH.');
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
      return sendError(502, stderr.trim() || 'Nmap exited with code ' + code + '.');
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

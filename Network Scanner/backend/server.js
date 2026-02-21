// Express backend to run nmap scans. Use responsibly (only scan authorized targets).
const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const app = express();
app.use(cors());
app.use(express.json());

function safeTarget(t) {
  if (!t || typeof t !== 'string') return false;
  // Basic allow: hostname, localhost, IPv4 and CIDR. Reject suspicious chars.
  if (/[^a-zA-Z0-9\.\-:\/]/.test(t)) return false;
  if (t.length > 200) return false;
  return true;
}

app.post('/api/scan', async (req, res) => {
  const { target, type='quick', ports='', sv=true, os=false } = req.body;
  if (!safeTarget(target)) return res.status(400).json({ error: 'Invalid target' });

  // Build nmap args based on type
  let args = ['-Pn'];
  if (type === 'quick') {
    args.push('--top-ports', '100');
    args.push('-sS');
  } else if (type === 'full') {
    args.push('-p', '1-65535');
    args.push('-sS');
  } else if (type === 'custom') {
    args.push('-p', ports || '1-1000');
    args.push('-sS');
  }
  if (sv) args.push('-sV');
  if (os) args.push('-O');
  args.push('--max-retries', '2');
  args.push('--host-timeout', '10m');
  args.push('--defeat-rst-ratelimit');
  args.push(target);

  try {
    const nmap = spawn('nmap', args);
    let out = '', err = '';
    nmap.stdout.on('data', (data) => { out += data.toString(); });
    nmap.stderr.on('data', (data) => { err += data.toString(); });
    nmap.on('close', (code) => {
      // Parse open ports (simple)
      const lines = out.split(/\r?\n/);
      const ports = [];
      for (const line of lines) {
        const m = line.match(/^(\d+)\/(tcp|udp)\s+(\S+)\s+(.+)$/);
        if (m) {
          ports.push({ port: parseInt(m[1],10), proto: m[2], state: m[3], info: m[4].trim() });
        }
      }
      res.json({ code, raw: lines, parsed: ports, stderr: err });
    });
  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
});

app.get('/api/health', (_,res)=>res.json({ ok: true }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, ()=>console.log(`Backend listening on ${PORT}`));

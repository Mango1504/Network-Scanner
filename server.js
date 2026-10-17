// Express backend for authorized Nmap scans.
const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const net = require('net');
const dns = require('dns').promises;

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
const truthAttempts = new Map();
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

function truthRateLimit(req, res, next) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const maxAttempts = 12;
  const key = req.ip || 'unknown';
  const recent = (truthAttempts.get(key) || []).filter(time => now - time < windowMs);
  if (recent.length >= maxAttempts) {
    res.setHeader('Retry-After', '600');
    return res.status(429).json({ error: 'Too many website checks. Please wait and try again.' });
  }
  recent.push(now);
  truthAttempts.set(key, recent);
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

function isSafePublicUrl(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 300) return null;
  let parsed;
  try {
    parsed = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || isBlockedTarget(parsed.hostname)) return null;
  return parsed;
}

async function assertPublicDns(hostname) {
  if (net.isIP(hostname)) return;
  const records = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!records.length || records.some(record => isBlockedTarget(record.address))) throw new Error('Target is not publicly reachable.');
}

async function fetchPublicPage(inputUrl) {
  let current = isSafePublicUrl(inputUrl);
  if (!current) throw new Error('Enter a valid public http(s) website URL.');

  for (let hop = 0; hop <= 2; hop += 1) {
    await assertPublicDns(current.hostname);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    let response;
    try {
      response = await fetch(current, {
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'User-Agent': 'ShieldProof-WebCheck/0.1 (+authorized-public-check)' }
      });
    } finally {
      clearTimeout(timer);
    }

    if (response.status >= 300 && response.status < 400 && response.headers.get('location')) {
      const next = new URL(response.headers.get('location'), current);
      if (!isSafePublicUrl(next.toString())) throw new Error('The website redirected to a blocked or invalid destination.');
      current = next;
      continue;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) throw new Error('The URL did not return an HTML page.');
    const chunks = [];
    let total = 0;
    for await (const chunk of response.body || []) {
      total += chunk.length;
      if (total > 1500000) throw new Error('The page is too large for a public check.');
      chunks.push(chunk);
    }
    return { response, url: current, html: Buffer.concat(chunks).toString('utf8') };
  }
  throw new Error('Too many redirects.');
}

function decodeHtml(value) {
  return value.replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>');
}

function extractHtmlEvidence(html, pageUrl) {
  const page = new URL(pageUrl);
  const resources = new Set();
  const policyLinks = new Set();
  const resourcePattern = /<(script|iframe|img|link)[^>]+(?:src|href)\s*=\s*["']([^"']+)["']/gi;
  let match;
  while ((match = resourcePattern.exec(html))) {
    try {
      const resource = new URL(decodeHtml(match[2]), page);
      if (['http:', 'https:'].includes(resource.protocol)) resources.add(resource.origin);
    } catch { /* Ignore malformed markup. */ }
  }
  const linkPattern = /<a[^>]+href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  while ((match = linkPattern.exec(html))) {
    const label = match[0].replace(/<[^>]+>/g, ' ').toLowerCase();
    if (/privacy|cookie|terms|legal|data protection/.test(label)) {
      try {
        const link = new URL(decodeHtml(match[1]), page);
        if (link.origin === page.origin) policyLinks.add(link.href);
      } catch { /* Ignore malformed links. */ }
    }
  }
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const knownTrackerPattern = /(google-analytics|googletagmanager|doubleclick|connect\.facebook|facebook\.net|hotjar|clarity\.ms|tiktok|linkedin|segment\.com)/i;
  const trackers = [...resources].filter(origin => knownTrackerPattern.test(origin));
  const cookies = (html.match(/\bdocument\.cookie\b/gi) || []).length;
  return { text, resources: [...resources], trackers, policyLinks: [...policyLinks], cookies };
}

function makeTruthFindings({ page, response, evidence, policyText }) {
  const findings = [];
  const selectedHeaders = ['strict-transport-security', 'content-security-policy', 'x-frame-options', 'x-content-type-options', 'referrer-policy', 'permissions-policy'];
  const headers = Object.fromEntries(selectedHeaders.map(name => [name, response.headers.get(name) || null]));
  const claimText = `${evidence.text} ${policyText || ''}`;
  const claims = {
    essentialOnly: /only (strictly )?(necessary|essential) cookies|essential cookies only/i.test(claimText),
    noCookies: /does not use cookies|doesn't use cookies|no cookies are used/i.test(claimText),
    noThirdPartySharing: /do not sell|does not sell|never share.{0,50}(personal|your) data/i.test(claimText),
    privacyPageFound: evidence.policyLinks.some(link => /privacy|data-protection/i.test(link))
  };

  if (!claims.privacyPageFound) findings.push({ severity: 'review', category: 'privacy', title: 'Privacy information was not clearly linked', evidence: 'No same-origin link labeled privacy or data protection was found on the checked page.', action: 'Add an easy-to-find privacy notice that matches your actual data practices.' });
  if (page.protocol === 'https:' && !headers['strict-transport-security']) findings.push({ severity: 'review', category: 'security', title: 'HSTS was not observed', evidence: 'The HTTPS response did not include Strict-Transport-Security.', action: 'Review HSTS configuration after confirming every required subdomain supports HTTPS.' });
  if (!headers['content-security-policy']) findings.push({ severity: 'info', category: 'security', title: 'Content Security Policy was not observed', evidence: 'The response did not include Content-Security-Policy.', action: 'Consider a carefully tested CSP to reduce script-injection impact.' });
  if (!headers['x-content-type-options']) findings.push({ severity: 'info', category: 'security', title: 'MIME-sniffing protection was not observed', evidence: 'The response did not include X-Content-Type-Options.', action: 'Consider sending X-Content-Type-Options: nosniff.' });
  if ((claims.essentialOnly || claims.noCookies) && evidence.trackers.length) findings.push({ severity: 'review', category: 'truth-diff', title: 'Policy language may not match observed third-party resources', evidence: `The page contains language suggesting limited/no cookies, but known tracking resources were observed: ${evidence.trackers.join(', ')}.`, action: 'Confirm consent behavior, tracker purpose, and policy wording with your privacy owner.' });
  if (claims.noThirdPartySharing && evidence.trackers.length) findings.push({ severity: 'review', category: 'truth-diff', title: 'Review third-party data-sharing language', evidence: `The page contains a no-sharing claim while known third-party tracking resources were observed: ${evidence.trackers.join(', ')}. This is not proof of sharing.`, action: 'Verify what data each provider receives and reconcile the policy with the real implementation.' });
  if (evidence.policyLinks.length > 3) findings.push({ severity: 'info', category: 'privacy', title: 'Multiple policy links were found', evidence: `${evidence.policyLinks.length} privacy/legal-related links were found.`, action: 'Make the source of truth clear so visitors are not sent to conflicting documents.' });
  return { headers, claims, findings };
}

app.post('/api/truth-check', truthRateLimit, async (req, res) => {
  const { url } = req.body || {};
  try {
    const pageResult = await fetchPublicPage(url);
    const evidence = extractHtmlEvidence(pageResult.html, pageResult.url.href);
    let policyText = '';
    const privacyLink = evidence.policyLinks.find(link => /privacy|data-protection/i.test(link));
    if (privacyLink) {
      try {
        const policyResult = await fetchPublicPage(privacyLink);
        policyText = extractHtmlEvidence(policyResult.html, policyResult.url.href).text.slice(0, 200000);
      } catch { /* The report remains useful if a policy page is unavailable. */ }
    }
    const result = makeTruthFindings({ page: pageResult.url, response: pageResult.response, evidence, policyText });
    const reviewCount = result.findings.filter(item => item.severity === 'review').length;
    res.json({
      type: 'truthdiff',
      checkedUrl: pageResult.url.href,
      fetchedAt: new Date().toISOString(),
      summary: { reviewCount, infoCount: result.findings.length - reviewCount, resourceCount: evidence.resources.length, trackerCount: evidence.trackers.length },
      observations: { status: pageResult.response.status, contentType: pageResult.response.headers.get('content-type'), resources: evidence.resources, trackers: evidence.trackers, policyLinks: evidence.policyLinks, scriptCookieReferences: evidence.cookies },
      ...result,
      disclaimer: 'This is an automated technical observation of a public page, not a legal opinion, certification, or penetration test.'
    });
  } catch (error) {
    res.status(400).json({ error: error.message === 'The page is too large for a public check.' ? error.message : 'The website could not be safely checked. Confirm it is a public HTML page and try again.' });
  }
});

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

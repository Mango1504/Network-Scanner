import React, { useMemo, useState } from "react";

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[ch]));
}

export default function NetworkScanner() {
  const [target, setTarget] = useState("");
  const [type, setType] = useState("quick");
  const [ports, setPorts] = useState("1-1000");
  const [sv, setSv] = useState(true);
  const [os, setOs] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState([]);
  const [raw, setRaw] = useState([]);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const [completedAt, setCompletedAt] = useState(null);
  const [changes, setChanges] = useState({ opened: [], closed: [] });
  const [previousScanAt, setPreviousScanAt] = useState(null);
  const [rememberHistory, setRememberHistory] = useState(false);

  function historyKey(value) {
    return "netsentinel:history:" + value.trim().toLowerCase();
  }

  function rowKey(row) {
    return [row.port, row.proto, row.state, row.info].join("|");
  }

  function readHistory(value) {
    if (!rememberHistory) return [];
    try {
      const saved = JSON.parse(localStorage.getItem(historyKey(value)) || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  }

  function saveHistory(value, scan) {
    if (!rememberHistory) return;
    const history = [scan, ...readHistory(value)].slice(0, 10);
    localStorage.setItem(historyKey(value), JSON.stringify(history));
  }

  const reviewItems = useMemo(() => results.filter(row => row.state === "open"), [results]);

  async function start(e) {
    e.preventDefault();
    if (!authorized) {
      setError("Confirm that you own or are authorized to scan this target.");
      return;
    }
    setRunning(true);
    setError(null);
    setStatus(null);
    setResults([]);
    setRaw([]);
    setCompletedAt(null);
    setChanges({ opened: [], closed: [] });
    setPreviousScanAt(null);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, type, ports, sv, os, authorized })
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error("The scan service returned an invalid response."); }
      if (!res.ok) throw new Error(data.error || "Scan failed");
      const parsed = data.parsed || [];
      const previous = readHistory(target)[0];
      const previousRows = previous?.rows || [];
      const currentKeys = new Set(parsed.map(rowKey));
      const previousKeys = new Set(previousRows.map(rowKey));
      const opened = parsed.filter(row => row.state === "open" && !previousKeys.has(rowKey(row)));
      const closed = previousRows.filter(row => row.state === "open" && !currentKeys.has(rowKey(row)));
      setResults(parsed);
      setRaw(data.raw || []);
      setCompletedAt(new Date());
      setChanges({ opened, closed });
      setPreviousScanAt(previous?.completedAt || null);
      saveHistory(target, { completedAt: new Date().toISOString(), type, rows: parsed });
      setStatus(parsed.length ? "Scan complete: " + parsed.length + " port row(s) found." : "Scan complete: no visible ports were found.");
    } catch (err) {
      setError(err.message || "Scan failed");
    } finally {
      setRunning(false);
    }
  }

  function downloadReport() {
    if (!completedAt) return;
    const rows = results.map(r => "<tr><td>" + escapeHtml(r.port) + "</td><td>" + escapeHtml(r.proto) + "</td><td>" + escapeHtml(r.state) + "</td><td>" + escapeHtml(r.info) + "</td></tr>").join("");
    const rawText = escapeHtml(raw.join("\n"));
    const changeRows = [...changes.opened.map(row => "<tr><td>Newly exposed</td><td>" + escapeHtml(row.port) + "</td><td>" + escapeHtml(row.proto) + "</td><td>" + escapeHtml(row.info) + "</td></tr>"), ...changes.closed.map(row => "<tr><td>Resolved</td><td>" + escapeHtml(row.port) + "</td><td>" + escapeHtml(row.proto) + "</td><td>" + escapeHtml(row.info) + "</td></tr>")].join("");
    const html = "<!doctype html><html><head><meta charset=\"utf-8\"><title>NetSentinel Shield exposure report</title><style>body{font:15px Arial;max-width:900px;margin:40px auto;color:#172033}h1{color:#0f3d73}.meta{background:#eef5ff;padding:16px;border-radius:8px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ccd5e0;padding:9px;text-align:left}th{background:#eef2f7}.note{margin-top:20px;padding:14px;background:#fff7df}pre{white-space:pre-wrap;background:#f6f8fa;padding:12px}</style></head><body><h1>NetSentinel Shield Exposure Report</h1><div class=\"meta\"><b>Target:</b> " + escapeHtml(target) + "<br><b>Scan completed:</b> " + escapeHtml(completedAt.toISOString()) + "<br><b>Scan type:</b> " + escapeHtml(type) + "</div><h2>Change evidence</h2><table><tr><th>Change</th><th>Port</th><th>Protocol</th><th>Service</th></tr>" + (changeRows || "<tr><td colspan=4>No changes recorded since the previous scan</td></tr>") + "</table><h2>Observed ports</h2><table><tr><th>Port</th><th>Protocol</th><th>State</th><th>Service</th></tr>" + (rows || "<tr><td colspan=4>No port rows returned</td></tr>") + "</table><div class=\"note\"><b>Scope:</b> This report records network observations from an authorized scan. An exposed port is a review item, not proof of a vulnerability. Confirm ownership, service necessity, patching, access controls, and least-privilege configuration separately.</div><details><summary>Raw Nmap output</summary><pre>" + rawText + "</pre></details><p>Generated by NetSentinel Shield.</p></body></html>";
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "netsentinel-report-" + target.replace(/[^a-z0-9.-]/gi, "_") + ".html";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <form onSubmit={start} style={{ display: "grid", gap: 12 }}>
        <label>Target (IP or Hostname)
          <input className="input" value={target} onChange={e => setTarget(e.target.value)} placeholder="scanme.nmap.org or 192.168.1.1" required />
        </label>
        <label>Scan Type
          <select className="input" value={type} onChange={e => setType(e.target.value)}>
            <option value="quick">Quick (top 100)</option>
            <option value="full">Full (1-65535)</option>
            <option value="custom">Custom (use Ports field)</option>
          </select>
        </label>
        <label>Ports (for custom)
          <input className="input" value={ports} onChange={e => setPorts(e.target.value)} placeholder="1-1000,22,80,443" />
        </label>
        <label style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <input type="checkbox" checked={sv} onChange={e => setSv(e.target.checked)} /> Service version (-sV)
          <input type="checkbox" checked={os} onChange={e => setOs(e.target.checked)} style={{ marginLeft: 20 }} /> OS detection (-O)
        </label>
        <label style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <input type="checkbox" checked={authorized} onChange={e => setAuthorized(e.target.checked)} required />
          <span>I own this target or have explicit permission to scan it.</span>
        </label>
        <label className="privacy-choice"><input type="checkbox" checked={rememberHistory} onChange={e => setRememberHistory(e.target.checked)} />
          <span>Store scan results in this browser to compare future scans <small>(optional, not uploaded)</small></span>
        </label>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button className="btn" disabled={running}>{running ? "Scanning..." : "Start Scan"}</button>
          <button type="button" className="btn" disabled={!completedAt} onClick={downloadReport}>Download client report</button>
          <div style={{ alignSelf: "center" }} className="small">Only scan authorized targets.</div>
        </div>
      </form>
      {error && <div style={{ color: "crimson", marginTop: 12 }}>{error}</div>}
      {status && !error && <div style={{ color: "#2563eb", marginTop: 12 }}>{status}</div>}
      {completedAt && <div className="summary-grid">
        <div className="summary-card"><span>Open review items</span><strong>{reviewItems.length}</strong><small>Observed in this scan</small></div>
        <div className="summary-card"><span>Newly exposed</span><strong className={changes.opened.length ? "warning" : "ok"}>{changes.opened.length}</strong><small>{previousScanAt ? "Compared with previous scan" : "First scan becomes your baseline"}</small></div>
        <div className="summary-card"><span>Resolved</span><strong className="ok">{changes.closed.length}</strong><small>Missing from this scan</small></div>
      </div>}
      {completedAt && (changes.opened.length > 0 || changes.closed.length > 0) && <div className="change-panel">
        <h3>Exposure changes</h3>
        {changes.opened.map((row, index) => <div className="change-row opened" key={"open-" + index}><b>Newly exposed</b><span>{row.port}/{row.proto}</span><small>{row.info || "service not identified"}</small></div>)}
        {changes.closed.map((row, index) => <div className="change-row closed" key={"closed-" + index}><b>Resolved</b><span>{row.port}/{row.proto}</span><small>{row.info || "service not identified"}</small></div>)}
      </div>}
      <h3 style={{ marginTop: 18 }}>Parsed Results</h3>
      <table className="table">
        <thead><tr><th>Port</th><th>Proto</th><th>State</th><th>Info</th></tr></thead>
        <tbody>{results.length === 0 ? <tr><td colSpan={4}>{status || "No results yet"}</td></tr> : results.map((r, i) => <tr key={i}><td>{r.port}</td><td>{r.proto}</td><td style={{ color: r.state === "open" ? "green" : "#444" }}>{r.state}</td><td>{r.info}</td></tr>)}</tbody>
      </table>
      <details style={{ marginTop: 12 }}><summary>Raw output</summary><pre style={{ whiteSpace: "pre-wrap" }}>{raw.join("\n")}</pre></details>
      <details className="privacy-details"><summary>Privacy, safety & acceptable use</summary><p>NetSentinel Shield only runs after you confirm that you own the target or have explicit permission. The public service blocks local and private network targets. Scan results are kept in this page only unless you choose the optional browser-history setting; clear your browser data to remove them. Do not enter credentials, secrets, personal data, or targets you are not authorized to assess.</p><p>This tool provides observations, not a penetration test or a guarantee of security. Review the report before sharing it with anyone.</p></details>
    </div>
  );
}

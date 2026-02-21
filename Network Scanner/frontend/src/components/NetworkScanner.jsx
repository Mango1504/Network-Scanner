import React, { useState } from "react";

export default function NetworkScanner() {
  const [target, setTarget] = useState("");
  const [type, setType] = useState("quick");
  const [ports, setPorts] = useState("1-1000");
  const [sv, setSv] = useState(true);
  const [os, setOs] = useState(false);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState([]);
  const [raw, setRaw] = useState([]);
  const [error, setError] = useState(null);

  async function start(e) {
    e.preventDefault();
    setRunning(true);
    setError(null);
    setResults([]);
    setRaw([]);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, type, ports, sv, os })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Scan failed");
      setResults(j.parsed || []);
      setRaw(j.raw || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <form onSubmit={start} style={{display:"grid", gap:12}}>
        <label>Target (IP or Hostname)
          <input className="input" value={target} onChange={e=>setTarget(e.target.value)} placeholder="scanme.nmap.org or 192.168.1.1" required />
        </label>
        <label>Scan Type
          <select className="input" value={type} onChange={e=>setType(e.target.value)}>
            <option value="quick">Quick (top 100)</option>
            <option value="full">Full (1-65535)</option>
            <option value="custom">Custom (use Ports field)</option>
          </select>
        </label>
        <label>Ports (for custom)
          <input className="input" value={ports} onChange={e=>setPorts(e.target.value)} placeholder="1-1000,22,80,443" />
        </label>
        <label style={{display:"flex", gap:12, alignItems:"center"}}>
          <input type="checkbox" checked={sv} onChange={e=>setSv(e.target.checked)} /> Service version (-sV)
          <input type="checkbox" checked={os} onChange={e=>setOs(e.target.checked)} style={{marginLeft:20}} /> OS detection (-O)
        </label>
        <div style={{display:"flex", gap:12}}>
          <button className="btn" disabled={running}>{running ? "Scanning..." : "Start Scan"}</button>
          <div style={{alignSelf:"center"}} className="small">Only scan authorized targets.</div>
        </div>
      </form>

      {error && <div style={{color:"crimson", marginTop:12}}>{error}</div>}

      <h3 style={{marginTop:18}}>Parsed Results</h3>
      <table className="table">
        <thead><tr><th>Port</th><th>Proto</th><th>State</th><th>Info</th></tr></thead>
        <tbody>
          {results.length === 0 ? <tr><td colSpan={4}>No results yet</td></tr> :
            results.map((r,i)=>(<tr key={i}><td>{r.port}</td><td>{r.proto}</td><td style={{color:r.state==="open"?"green":"#444"}}>{r.state}</td><td>{r.info}</td></tr>))
          }
        </tbody>
      </table>

      <details style={{marginTop:12}}>
        <summary>Raw output</summary>
 <pre style={{ whiteSpace: "pre-wrap" }}>{raw.join("\n")}</pre>

      </details>
    </div>
  );
}

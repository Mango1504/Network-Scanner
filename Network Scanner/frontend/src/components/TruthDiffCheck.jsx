import React, { useState } from "react";

export default function TruthDiffCheck() {
  const [url, setUrl] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function check(e) {
    e.preventDefault();
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/truth-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The website could not be checked.");
      setResult(data);
    } catch (err) {
      setError(err.message || "The website could not be checked.");
    } finally {
      setRunning(false);
    }
  }

  function download() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "truthdiff-report.json";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return <div className="truth-check">
    <div className="truth-intro"><div><span className="step-label">PUBLIC CHECK · NO ACCOUNT REQUIRED</span><h2>Does your website behave like its policy says?</h2><p>TruthDiff compares observable page behavior with privacy and security signals. It finds potential mismatches, not legal verdicts.</p></div><div className="truth-orbit">⌁</div></div>
    <form className="truth-form" onSubmit={check}>
      <label>Website or domain<input className="input" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://yourwebsite.com" required /></label>
      <button className="btn truth-button" disabled={running}>{running ? "Checking public signals..." : "Check my website"}</button>
    </form>
    <div className="truth-safety"><span>✓ Public, non-intrusive check</span><span>✓ No credentials requested</span><span>✓ No legal compliance claim</span></div>
    {error && <div className="truth-error">{error}</div>}
    {result && <div className="truth-result">
      <div className="result-header"><div><span className="step-label">TRUTHDIFF RESULT</span><h3>{new URL(result.checkedUrl).hostname}</h3><small>Checked {new Date(result.fetchedAt).toLocaleString()}</small></div><button className="btn secondary-button" type="button" onClick={download}>Download evidence</button></div>
      <div className="truth-metrics"><div><strong>{result.summary.reviewCount}</strong><span>Potential mismatches</span></div><div><strong>{result.summary.trackerCount}</strong><span>Known trackers</span></div><div><strong>{result.summary.policyLinks?.length || result.observations.policyLinks.length}</strong><span>Policy links</span></div><div><strong>{result.observations.status}</strong><span>HTTP status</span></div></div>
      <div className="finding-list">{result.findings.length === 0 ? <div className="empty-result"><strong>No obvious mismatch observed</strong><span>That is not a legal certification or a guarantee. Recheck after material website changes.</span></div> : result.findings.map((finding, index) => <article className={"finding-card " + finding.severity} key={index}><div className="finding-badge">{finding.severity === "review" ? "REVIEW" : "INFO"}</div><div><h4>{finding.title}</h4><p><b>Evidence:</b> {finding.evidence}</p><p><b>Suggested next step:</b> {finding.action}</p></div></article>)}</div>
      <details className="evidence-details"><summary>Observed evidence</summary><p><b>Resources:</b> {result.observations.resources.length ? result.observations.resources.join(", ") : "No external resources detected"}</p><p><b>Privacy/legal links:</b> {result.observations.policyLinks.length ? result.observations.policyLinks.join(", ") : "None detected"}</p><p><b>Security headers:</b> {Object.entries(result.headers).filter(([, value]) => value).map(([key]) => key).join(", ") || "None of the selected headers observed"}</p></details>
      <p className="truth-disclaimer">{result.disclaimer}</p>
    </div>}
  </div>;
}

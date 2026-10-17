import React, { useState } from "react";
import NetworkScanner from "./components/NetworkScanner";
import TruthDiffCheck from "./components/TruthDiffCheck";

export default function App() {
  const [mode, setMode] = useState("truth");
  return (
    <div className="container">
      <nav className="topbar"><a className="brand" href="/">NS <span>NetSentinel</span></a><div className="nav-links"><a href="#scanner">Scanner</a><a href="#how-it-works">How it works</a><span className="status-pill"><i></i> Service online</span></div></nav>
      <header className="hero">
        <div>
          <div className="eyebrow">WEBSITE TRUST & SECURITY</div>
          <h1 style={{marginBottom:8}}>Find the gap between what your website says and does.</h1>
          <p className="subtitle">A public, evidence-first check for privacy signals, security posture, and potential policy mismatches.</p>
          <div className="trust-row"><span>✓ Permission-first</span><span>✓ Clear remediation</span><span>✓ Evidence you can share</span></div>
        </div>
        <div className="posture-card">
          <div className="posture-top"><span>SECURITY POSTURE</span><span className="muted-label">NO BASELINE YET</span></div>
          <div className="posture-score"><strong>—</strong><span>Awaiting your first authorized scan</span></div>
          <div className="posture-line"><i></i><span>Open review items</span><b>—</b></div>
          <div className="posture-line"><i></i><span>Exposure changes</span><b>—</b></div>
          <div className="posture-line"><i></i><span>Client report</span><b>Ready after scan</b></div>
        </div>
      </header>
      <div className="product-grid" id="how-it-works">
        <div className="product-point"><b>1. Observe</b><span>See public cookies, resources, policies, headers, and domain signals.</span></div>
        <div className="product-point"><b>2. Compare</b><span>Spot potential mismatches between policy language and page behavior.</span></div>
        <div className="product-point"><b>3. Improve</b><span>Get evidence and a next step, then recheck after the fix.</span></div>
      </div>
      <div className="mode-switch" id="scanner"><button className={mode === "truth" ? "active" : ""} onClick={() => setMode("truth")}>Website trust check</button><button className={mode === "authorized" ? "active" : ""} onClick={() => setMode("authorized")}>Authorized exposure scan</button></div>
      <div className="card scanner-card">
        {mode === "truth" ? <TruthDiffCheck /> : <><div className="card-heading"><div><span className="step-label">AUTHORIZED MODE · DEEPER CHECK</span><h2>Run an authorized exposure scan</h2><p>Use this only for systems you own or have explicit permission to assess.</p></div><div className="shield-mark">◈</div></div><NetworkScanner /></>}
      </div>
      <footer className="footer-note">NetSentinel Shield reports observations from authorized scans. It does not replace a penetration test or guarantee that a system is secure.</footer>
    </div>
  );
}

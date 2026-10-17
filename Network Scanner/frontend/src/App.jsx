import React from "react";
import NetworkScanner from "./components/NetworkScanner";

export default function App() {
  return (
    <div className="container">
      <nav className="topbar"><a className="brand" href="/">NS <span>NetSentinel</span></a><div className="nav-links"><a href="#scanner">Scanner</a><a href="#how-it-works">How it works</a><span className="status-pill"><i></i> Service online</span></div></nav>
      <header className="hero">
        <div>
          <div className="eyebrow">EXTERNAL EXPOSURE MONITORING</div>
          <h1 style={{marginBottom:8}}>A clearer view of what your team has exposed.</h1>
          <p className="subtitle">NetSentinel Shield turns an authorized scan into a simple baseline, change log, and action list.</p>
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
        <div className="product-point"><b>1. Baseline</b><span>See externally visible services and configuration signals.</span></div>
        <div className="product-point"><b>2. Compare</b><span>Catch newly exposed or resolved services on repeat scans.</span></div>
        <div className="product-point"><b>3. Prove</b><span>Download evidence and remediation notes for your client.</span></div>
      </div>
      <div className="card scanner-card" id="scanner">
        <div className="card-heading"><div><span className="step-label">STEP 01 · BASELINE</span><h2>Run an authorized scan</h2><p>Start with a hostname or public IP you control. Nothing runs until you confirm permission.</p></div><div className="shield-mark">◈</div></div>
        <NetworkScanner />
      </div>
      <footer className="footer-note">NetSentinel Shield reports observations from authorized scans. It does not replace a penetration test or guarantee that a system is secure.</footer>
    </div>
  );
}

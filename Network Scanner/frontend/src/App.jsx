import React from "react";
import NetworkScanner from "./components/NetworkScanner";

export default function App() {
  return (
    <div className="container">
      <header className="hero">
        <div>
          <div className="eyebrow">NETSENTINEL SHIELD</div>
          <h1 style={{marginBottom:8}}>Know what changed on your internet exposure</h1>
          <p className="subtitle">Authorized exposure scans and client-ready evidence for small teams.</p>
          <div className="trust-row"><span>✓ Permission-first</span><span>✓ Clear remediation</span><span>✓ Evidence you can share</span></div>
        </div>
        <div className="offer-card">
          <span className="offer-label">PILOT SECURITY BASELINE</span>
          <strong>Find the exposure worth fixing</strong>
          <p>Run one authorized scan, review the findings, and leave with a concise report your team can act on.</p>
          <a href="https://github.com/Mango1504" target="_blank" rel="noreferrer" className="link-button">Request a pilot via GitHub ↗</a>
        </div>
      </header>
      <div className="product-grid">
        <div className="product-point"><b>1. Baseline</b><span>See externally visible services and configuration signals.</span></div>
        <div className="product-point"><b>2. Compare</b><span>Catch newly exposed or resolved services on repeat scans.</span></div>
        <div className="product-point"><b>3. Prove</b><span>Download evidence and remediation notes for your client.</span></div>
      </div>
      <div className="card">
        <NetworkScanner />
      </div>
      <footer className="footer-note">NetSentinel Shield reports observations from authorized scans. It does not replace a penetration test or guarantee that a system is secure.</footer>
    </div>
  );
}

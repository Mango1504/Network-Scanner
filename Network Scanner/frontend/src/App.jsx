import React from "react";
import NetworkScanner from "./components/NetworkScanner";

export default function App() {
  return (
    <div className="container">
      <div className="eyebrow">NETSENTINEL SHIELD</div>
      <h1 style={{marginBottom:8}}>Know what changed on your internet exposure</h1>
      <p className="subtitle">Authorized exposure scans and client-ready evidence for small teams.</p>
      <div className="card">
        <NetworkScanner />
      </div>
    </div>
  );
}

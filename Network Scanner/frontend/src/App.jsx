import React from "react";
import NetworkScanner from "./components/NetworkScanner";

export default function App() {
  return (
    <div className="container">
      <h1 style={{marginBottom:12}}>Enhanced Network Scanner</h1>
      <div className="card">
        <NetworkScanner />
      </div>
    </div>
  );
}

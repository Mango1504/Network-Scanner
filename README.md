# NetSentinel Recon 🛡️

[![Live Demo](https://img.shields.io/badge/Live_Demo-Online-success?style=for-the-badge&logo=render)](https://network-scanner-o01w.onrender.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**NetSentinel Recon** (formerly Enhanced Network Scanner) is an enterprise-grade, web-based network scanning application. It wraps the powerful `nmap` OS tool in a modern React frontend and an Express/WebSocket backend.

It allows you to securely queue scans, parse complex XML results into readable dashboards, and review historical scan data from a local SQLite database.

---

## ✨ Features
- **Real-Time Progress:** Uses WebSockets (`socket.io`) to stream scan status directly to the browser.
- **Asynchronous Queuing:** Prevents server overload by managing simultaneous `nmap` scans efficiently.
- **Robust XML Parsing:** Extracts deep insights (Protocol, Service, Version, OS) using `xml2js`.
- **Scan History:** Persists all scan data into a local SQLite database for future review.
- **Dockerized:** Fully packaged into a single container for seamless cloud deployment.

---

## 🚀 Live Demo
You can try out the live version of NetSentinel Recon here:
**[https://network-scanner-o01w.onrender.com](https://network-scanner-o01w.onrender.com)**

*(Note: The live version is hosted on a free tier. It may take 30-60 seconds to wake up if it hasn't been used recently.)*

---

## 💻 How to Run Locally (Offline)

If you want to run or develop the application on your own computer, follow these steps.

### Prerequisites
1. **Node.js** (v16 or higher)
2. **Nmap**: You *must* have Nmap installed on your operating system for the backend to work. Download it from [nmap.org](https://nmap.org/download.html).

### Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/Mango1504/Network-Scanner.git
   cd Network-Scanner
   ```
2. Install Backend Dependencies & Run:
   ```bash
   cd backend
   npm install
   node server.js
   ```
3. Install Frontend Dependencies & Run (in a new terminal):
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
4. Open your browser and navigate to `http://localhost:5173`.

---

## 🐳 How to Run via Docker

To avoid installing Nmap on your host machine, you can run the entire stack using Docker.

1. Build the Docker Image:
   ```bash
   docker build -t netsentinel-recon .
   ```
2. Run the Container:
   ```bash
   docker run -p 5000:5000 netsentinel-recon
   ```
3. Open your browser and navigate to `http://localhost:5000`.

---

## ⚠️ Disclaimer
**Use Responsibly.** This tool is intended for educational purposes and authorized auditing only. Never scan a target (IP or domain) without explicit permission from the owner. The creator of this repository is not responsible for any misuse.

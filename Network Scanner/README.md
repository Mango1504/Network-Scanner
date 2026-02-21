Enhanced Full-Stack Network Scanner (React frontend + Node/Express backend)

How to run (development):

1) Ensure Node.js is installed and nmap is installed & available in PATH.

2) Start backend:
   cd backend
   npm install
   node server.js
   -> Backend runs on http://localhost:5000

3) Start frontend (in a new terminal):
   cd frontend
   npm install
   npm run dev
   -> Frontend runs on http://localhost:5173 and proxies /api to backend

Security & ethics: Only scan systems you own or have explicit permission to test.
Network-Scanner

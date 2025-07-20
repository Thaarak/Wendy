#!/bin/bash

# Start the backend (FastAPI/Uvicorn)
echo "Starting backend server..."
cd mcp-server
uvicorn wendy_mcp_server:app --reload --host 0.0.0.0 --port 8000 > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Start the frontend (Next.js)
echo "Starting frontend (Next.js)..."
pnpm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!

# Print info
echo "Backend PID: $BACKEND_PID (logs: backend.log)"
echo "Frontend PID: $FRONTEND_PID (logs: frontend.log)"
echo "---"
echo "Demo servers are starting."
echo "- Frontend: http://localhost:3000"
echo "- Backend:  http://localhost:8000"
echo "---"
echo "To stop both, run:"
echo "  kill $BACKEND_PID $FRONTEND_PID" 
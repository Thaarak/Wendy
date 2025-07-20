#!/bin/bash

# Start backend
echo "Starting backend server..."
cd mcp-server
uvicorn wendy_mcp_server:app --reload --host 0.0.0.0 --port 8000 > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Start frontend
echo "Starting frontend (Next.js)..."
pnpm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!

sleep 2
echo "Tailing backend.log:"
tail -n 20 -f backend.log &
TAIL1_PID=$!
echo "Tailing frontend.log:"
tail -n 20 -f frontend.log &
TAIL2_PID=$!

echo "To stop everything, run:"
echo "  kill $BACKEND_PID $FRONTEND_PID $TAIL1_PID $TAIL2_PID"
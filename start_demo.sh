#!/bin/bash
set -e

# Colors for better visibility
green='\033[0;32m'
yellow='\033[1;33m'
reset='\033[0m'

# Cleanup function to kill all child processes
cleanup() {
  echo -e "${yellow}Stopping all demo processes...${reset}"
  kill $BACKEND_PID $FRONTEND_PID $TAIL1_PID $TAIL2_PID 2>/dev/null || true
  exit
}
trap cleanup SIGINT SIGTERM

# Ensure backend Python venv and dependencies
cd mcp-server
echo -e "${yellow}Setting up Python venv and installing backend dependencies...${reset}"
if [ ! -d "venv" ]; then
  python3 -m venv venv
fi
source venv/bin/activate
pip3 install --upgrade pip > /dev/null
pip3 install -r requirements.txt > /dev/null
cd ..

# Ensure frontend dependencies
if [ ! -d "node_modules" ]; then
  echo -e "${yellow}Installing frontend dependencies...${reset}"
  pnpm install
fi

# Check for .env files (warn if missing)
if [ ! -f ".env" ]; then
  echo -e "${yellow}Warning: .env file not found in project root. Some features may not work.${reset}"
fi

# Start backend
cd mcp-server
echo -e "${green}Starting backend server...${reset}"
uvicorn wendy_mcp_server:app --reload --host 0.0.0.0 --port 8000 > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Start frontend

echo -e "${green}Starting frontend (Next.js)...${reset}"
pnpm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!

sleep 3
echo -e "${yellow}Streaming backend logs (backend.log):${reset}"
tail -n 40 -f backend.log &
TAIL1_PID=$!
echo -e "${yellow}Streaming frontend logs (frontend.log):${reset}"
tail -n 40 -f frontend.log &
TAIL2_PID=$!

echo -e "\n${green}Demo environment is ready!${reset}"
echo "To stop everything, run:"
echo "  kill $BACKEND_PID $FRONTEND_PID $TAIL1_PID $TAIL2_PID"
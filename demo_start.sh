#!/usr/bin/env bash
set -e

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${GREEN}${BOLD}"
echo "  ==========================================================="
echo "   ____        _     _     _   _    _    ___"
echo "  |  _ \  _ __(_)___| |__ | |_(_)  / \  |_ _|"
echo "  | | | |/ '__| / __| '_ \| __| | / _ \  | |"
echo "  | |_| | |  | \__ \ | | | |_| |/ ___ \ | |"
echo "  |____/|_|  |_|___/_| |_|\__|_/_/   \_\___|"
echo ""
echo "   AI-Powered Preventive Retinal Health Platform"
echo "   SIH 2026 Grand Finale — Live Demo"
echo -e "  ===========================================================${NC}"
echo ""

# Check dependencies
command -v python3 >/dev/null 2>&1 || { echo "  [ERROR] Python 3 not found!"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "  [ERROR] Node.js not found!"; exit 1; }

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    echo ""
    echo -e "${CYAN}  Stopping demo servers...${NC}"
    [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null
    [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null
    echo "  Demo servers stopped. Goodbye!"
    exit 0
}

trap cleanup SIGINT SIGTERM

echo -e "  ${CYAN}[1/3]${NC} Starting Flask Backend on port 5000..."
python3 app.py &
BACKEND_PID=$!
sleep 3

echo -e "  ${CYAN}[2/3]${NC} Starting Vite Frontend on port 3000..."
npm run dev &
FRONTEND_PID=$!
sleep 3

echo ""
echo -e "${GREEN}${BOLD}"
echo "  ==========================================================="
echo "   DrishtiAI is LIVE!"
echo ""
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:5000"
echo "   API Docs:  http://localhost:5000/api/health"
echo "   Metrics:   http://localhost:5000/api/analytics/metrics"
echo -e "  ===========================================================${NC}"
echo ""
echo "  Press Ctrl+C to stop the demo servers..."

wait

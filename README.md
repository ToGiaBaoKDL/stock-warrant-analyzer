# Stock & Warrant Analyzer - Quick Start

## Prerequisites
- Python 3.8+
- Node.js 18+
- Redis (optional, for caching)

## Setup & Run

### Backend (FastAPI)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
Backend runs at: `http://localhost:8000`

### Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at: `http://localhost:3000`

## Features
- Warrant Screener - Filter warrants by underlying stock
- What-if Calculator - Simulate profit/loss scenarios
- Stock Analysis - View detailed stock information
- Anthropic Theme - Clean, minimal design

## API Integration
- Backend fetches live data from SSI FastConnect API
- CORS configured for localhost development
- All calculations happen on frontend (stock prices, fees, taxes)

## Troubleshooting
- **Port in use**: Change `NEXT_PUBLIC_API_URL` in `.env.local`
- **Network errors**: Ensure backend is running before starting frontend
- **No warrants showing**: Check SSI API connectivity in backend logs

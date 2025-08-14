# GTFS Boss Quick Start Guide

## Prerequisites

- Node.js (v14 or higher)
- Python 3.8 or higher
- Git

## Project Structure

```
GTFS_Boss/
├── src/
│   ├── gtfs_boss/          # Backend Python code
│   ├── frontend/           # Frontend React/TypeScript code
│   ├── venv/               # Python virtual environment
│   └── requirements.txt    # Python dependencies
├── package.json            # Root package.json (can be ignored)
└── requirements.txt        # Python dependencies (root level)
```

## Backend Setup

1. Navigate to the project root:
```bash
cd /Users/wafflehouz/Documents/Projects/GTFS_Boss
```

2. Navigate to the src directory:
```bash
cd src
```

3. Create and activate virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

4. Install dependencies:
```bash
pip install -r ../requirements.txt
```

5. Start the backend server:
```bash
PYTHONPATH=$PYTHONPATH:. uvicorn gtfs_boss.main:app --reload --port 8000
```

The backend API will be available at `http://localhost:8000`

## Frontend Setup

1. Navigate to the project root:
```bash
cd /Users/wafflehouz/Documents/Projects/GTFS_Boss
```

2. Navigate to the frontend directory:
```bash
cd src/frontend
```

3. Install dependencies (if not already installed):
```bash
npm install
```

4. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Quick Commands

### Backend
```bash
# Start backend server
cd /Users/wafflehouz/Documents/Projects/GTFS_Boss/src
source venv/bin/activate
PYTHONPATH=$PYTHONPATH:. uvicorn gtfs_boss.main:app --reload --port 8000

# Run tests
pytest

# Run linter
flake8

# Run type checker
mypy src/
```

### Frontend
```bash
# Start development server
cd /Users/wafflehouz/Documents/Projects/GTFS_Boss/src/frontend
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run linter
npm run lint
```

## Development Workflow

1. Start both servers in separate terminals:

**Terminal 1 (Backend):**
```bash
cd /Users/wafflehouz/Documents/Projects/GTFS_Boss/src
source venv/bin/activate
PYTHONPATH=$PYTHONPATH:. uvicorn gtfs_boss.main:app --reload --port 8000
```

**Terminal 2 (Frontend):**
```bash
cd /Users/wafflehouz/Documents/Projects/GTFS_Boss/src/frontend
npm run dev
```

2. Access the application:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

## Common Issues & Solutions

1. **Import Error: "attempted relative import with no known parent package"**
   - Solution: Use absolute imports in main.py (already fixed)
   - Ensure PYTHONPATH is set correctly

2. **Port Already in Use**
   - Kill existing processes: `lsof -ti:8000 | xargs kill -9`
   - Or use a different port: `--port 8001`

3. **Frontend Dependencies**
   - Clear node_modules and reinstall if dependencies are missing
   - Check for TypeScript errors
   - Verify Node.js version compatibility

4. **Backend Issues**
   - Check virtual environment is activated
   - Verify all dependencies are installed
   - Ensure PYTHONPATH is set correctly
   - Make sure you're in the src directory when starting

## Troubleshooting Commands

```bash
# Check what's running on specific ports
lsof -i :8000  # Backend port
lsof -i :5173  # Frontend port

# Kill processes on specific ports
lsof -ti:8000 | xargs kill -9
lsof -ti:5173 | xargs kill -9

# Check Python imports
cd src
source venv/bin/activate
python -c "import gtfs_boss.main; print('Import successful')"
```

## Stopping the Servers

- Frontend: Press `Ctrl+C` in the frontend terminal
- Backend: Press `Ctrl+C` in the backend terminal
- Deactivate virtual environment: `deactivate`

## Notes

- The project uses Vite for frontend development (port 5173 by default)
- The backend uses FastAPI with uvicorn (port 8000)
- No database setup is required for basic functionality
- The virtual environment should be created in the `src` directory 
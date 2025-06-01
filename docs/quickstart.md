# GTFS Boss Quick Start Guide

## Prerequisites

- Node.js (v14 or higher)
- Python 3.8 or higher
- PostgreSQL 12 or higher
- Git

## Backend Setup

1. Navigate to the src directory:
```bash
cd src
```

2. Create and activate virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

5. Initialize the database:
```bash
alembic upgrade head
```

6. Start the backend server:
```bash
PYTHONPATH=$PYTHONPATH:. uvicorn gtfs_boss.main:app --reload
```

The backend API will be available at `http://localhost:8000`

## Frontend Setup

1. Navigate to the src directory:
```bash
cd src
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## Quick Commands

### Backend
```bash
# Start backend server
cd src
PYTHONPATH=$PYTHONPATH:. uvicorn gtfs_boss.main:app --reload

# Run tests
pytest

# Run linter
flake8

# Run type checker
mypy src/

# Generate API documentation
python scripts/generate_api_docs.py
```

### Frontend
```bash
# Start development server
cd src
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run linter
npm run lint

# Run type checker
npm run type-check
```

## Development Workflow

1. Start both servers:
```bash
# Terminal 1 (Backend)
cd src
PYTHONPATH=$PYTHONPATH:. uvicorn gtfs_boss.main:app --reload

# Terminal 2 (Frontend)
cd src
npm run dev
```

2. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

## Common Issues

1. Database Connection:
   - Ensure PostgreSQL is running
   - Check DATABASE_URL in .env
   - Run `alembic upgrade head` if database is not initialized

2. Frontend Build:
   - Clear node_modules and reinstall if dependencies are missing
   - Check for TypeScript errors
   - Verify environment variables

3. Backend Issues:
   - Check virtual environment is activated
   - Verify all dependencies are installed
   - Check database migrations are up to date
   - Ensure PYTHONPATH is set correctly

## Stopping the Servers

- Frontend: Press `Ctrl+C` in the frontend terminal
- Backend: Press `Ctrl+C` in the backend terminal
- Deactivate virtual environment: `deactivate` 
# Contributing to GTFS Boss

Thank you for your interest in contributing to GTFS Boss! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Create a new branch for your feature or bugfix
4. Make your changes
5. Test your changes thoroughly
6. Submit a pull request

## Development Setup

### Backend Setup
```bash
cd src
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r ../requirements.txt
PYTHONPATH=$PYTHONPATH:. uvicorn gtfs_boss.main:app --reload --port 8000
```

### Frontend Setup
```bash
cd src/frontend
npm install
npm run dev
```

## Code Style

### Python (Backend)
- Follow PEP 8 style guidelines
- Use type hints
- Write docstrings for functions and classes
- Run `flake8` and `mypy` before committing

### TypeScript (Frontend)
- Use TypeScript strict mode
- Follow React best practices
- Use functional components with hooks
- Write unit tests for components

## Testing

- Write tests for new features
- Ensure all tests pass before submitting PR
- Test both backend and frontend changes
- Test with real GTFS data when possible

## Pull Request Process

1. Ensure your code follows the style guidelines
2. Add tests for new functionality
3. Update documentation if needed
4. Submit a clear description of your changes
5. Reference any related issues

## Reporting Issues

When reporting issues, please include:
- Description of the problem
- Steps to reproduce
- Expected vs actual behavior
- GTFS feed used (if applicable)
- Browser/OS information (for frontend issues)

## Questions?

Feel free to open an issue for any questions about contributing to the project.

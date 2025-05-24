# GTFS Boss Build Plan

## Development Context
- Single developer workflow
- Single workstation development
- Local development environment
- Latest stable dependency versions
- Focus on rapid prototyping and iteration

## Phase 1: Project Setup and Static GTFS Validation (Week 1)

### 1.1 Project Initialization
- [ ] Set up Python project structure with FastAPI
- [ ] Create requirements.txt with latest dependencies:
  - gtfs_kit (latest)
  - fastapi (latest)
  - uvicorn (latest)
  - sqlalchemy (latest)
  - psycopg2-binary (latest)
  - python-multipart (latest)
- [ ] Set up SQLite database (simplified from PostgreSQL for initial development)
- [ ] Create basic project documentation
- [ ] Set up pre-commit hooks for code quality

### 1.2 Static GTFS Validation Core
- [ ] Implement GTFS file parsing using gtfs_kit
- [ ] Create validation rules for required files:
  - stops.txt
  - trips.txt
  - routes.txt
  - calendar.txt
  - agency.txt
- [ ] Implement foreign key validation:
  - trip.service_id → calendar.txt
  - trip.route_id → routes.txt
  - stop_times.trip_id → trips.txt
  - stop_times.stop_id → stops.txt
- [ ] Add coordinate validation for stops
- [ ] Create validation result formatter (JSON/CSV)

## Phase 2: Real-Time GTFS Implementation (Week 2)

### 2.1 GTFS-RT Integration
- [ ] Set up gtfs-realtime-bindings (latest)
- [ ] Implement real-time feed parsing:
  - Vehicle positions
  - Trip updates
  - Service alerts
- [ ] Create validation against static GTFS:
  - Trip ID existence check
  - Timestamp validation
  - Route consistency

### 2.2 Data Storage
- [ ] Design simplified database schema for:
  - Static GTFS data
  - Real-time updates
  - Validation results
- [ ] Implement data models
- [ ] Create database migration scripts

## Phase 3: Basic Visualization (Week 3)

### 3.1 Frontend Setup
- [ ] Initialize React project with Vite (latest)
- [ ] Set up project structure:
  - Components
  - Pages
  - Services
  - Utils
- [ ] Configure build system

### 3.2 Map Implementation
- [ ] Integrate Leaflet (latest)
- [ ] Create base map component
- [ ] Implement route visualization
- [ ] Add stop markers
- [ ] Create real-time vehicle position updates

### 3.3 Basic UI Components
- [ ] Create file upload component
- [ ] Implement validation results display
- [ ] Add basic navigation
- [ ] Create error reporting interface

## Phase 4: Integration and Testing (Week 4)

### 4.1 Backend Integration
- [ ] Connect frontend to backend API
- [ ] Implement file upload handling
- [ ] Create validation result endpoints
- [ ] Set up real-time data streaming

### 4.2 Testing
- [ ] Write unit tests for:
  - GTFS validation
  - Real-time feed parsing
  - API endpoints
- [ ] Create integration tests
- [ ] Perform end-to-end testing

### 4.3 Documentation
- [ ] Create API documentation
- [ ] Write user guide
- [ ] Document deployment process

## Phase 5: Deployment and Optimization (Week 5)

### 5.1 Performance Optimization
- [ ] Implement lazy loading for large GTFS files
- [ ] Add in-memory caching for static data
- [ ] Optimize database queries
- [ ] Implement background tasks for validation

### 5.2 Deployment
- [ ] Create simplified Docker configuration
- [ ] Set up basic GitHub Actions workflow
- [ ] Configure development environment
- [ ] Document deployment process

## Future Enhancements

### Phase 6: Advanced Features
- [ ] Implement diff tool for GTFS versions
- [ ] Add performance metrics calculation
- [ ] Add custom validation rules support

### Phase 7: Community Features
- [ ] Add plugin system
- [ ] Implement GitHub integration
- [ ] Create community documentation

## Technical Requirements

### Backend
- Python 3.11+
- FastAPI (latest)
- SQLite (initial development)
- PostgreSQL (future migration)
- Redis (optional, for future scaling)

### Frontend
- Node.js 20+
- React 18+
- Vite (latest)
- Leaflet (latest)
- TypeScript 5+

### Development Tools
- Git
- VS Code with recommended extensions
- Postman/Insomnia (for API testing)
- Docker (optional, for future scaling)

## Getting Started

1. Clone the repository
2. Set up Python virtual environment
3. Install dependencies
4. Start development server
5. Access the application at http://localhost:8000

## Development Workflow

### Daily Tasks
- Morning: Review and plan day's tasks
- Development: Focus on one feature/component at a time
- Evening: Commit changes and update documentation

### Code Quality
- Use pre-commit hooks for:
  - Code formatting (black)
  - Linting (flake8)
  - Type checking (mypy)
- Write tests for new features
- Document code changes

### Version Control
- Use feature branches
- Regular commits with clear messages
- Pull requests for major changes
- Keep main branch stable

## Notes
- Focus on rapid prototyping and iteration
- Regular commits and documentation updates
- Daily progress reviews
- Adjust timeline based on complexity of features
- Consider using SQLite for initial development, migrate to PostgreSQL when needed 
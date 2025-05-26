# GTFS Boss Backend Documentation

## Overview

The GTFS Boss backend is built using FastAPI and provides a robust API for GTFS feed validation, real-time monitoring, and data management.

## API Endpoints

### GTFS Feed Validation

#### `POST /api/v1/validate`
Validates a GTFS feed against the GTFS specification.

**Request Body:**
```json
{
    "feed_url": "string",
    "feed_type": "static" | "realtime",
    "validation_level": "basic" | "strict"
}
```

**Response:**
```json
{
    "status": "success" | "error",
    "validation_results": {
        "errors": [
            {
                "file": "string",
                "line": "number",
                "message": "string",
                "severity": "error" | "warning"
            }
        ],
        "warnings": [
            {
                "file": "string",
                "line": "number",
                "message": "string",
                "severity": "warning"
            }
        ],
        "summary": {
            "total_errors": "number",
            "total_warnings": "number",
            "validation_time": "string"
        }
    }
}
```

### Real-Time Monitoring

#### `GET /api/v1/realtime/vehicles`
Retrieves real-time vehicle positions and status.

**Query Parameters:**
- `route_id` (optional): Filter by route ID
- `agency_id` (optional): Filter by agency ID
- `timestamp` (optional): Get data for specific timestamp

**Response:**
```json
{
    "vehicles": [
        {
            "vehicle_id": "string",
            "route_id": "string",
            "trip_id": "string",
            "latitude": "number",
            "longitude": "number",
            "bearing": "number",
            "speed": "number",
            "timestamp": "string",
            "schedule_deviation": "number",
            "status": "on_time" | "minor_delay" | "major_delay"
        }
    ],
    "timestamp": "string"
}
```

#### `GET /api/v1/realtime/alerts`
Retrieves real-time service alerts.

**Query Parameters:**
- `agency_id` (optional): Filter by agency ID
- `route_id` (optional): Filter by route ID
- `active_only` (optional): Show only active alerts

**Response:**
```json
{
    "alerts": [
        {
            "alert_id": "string",
            "header": "string",
            "description": "string",
            "severity": "low" | "medium" | "high",
            "start_time": "string",
            "end_time": "string",
            "affected_routes": ["string"],
            "affected_stops": ["string"]
        }
    ]
}
```

### Data Management

#### `POST /api/v1/feeds`
Upload a new GTFS feed.

**Request Body:**
```json
{
    "feed_name": "string",
    "feed_type": "static" | "realtime",
    "agency_id": "string",
    "feed_data": "base64_encoded_zip_file"
}
```

#### `GET /api/v1/feeds`
List all available GTFS feeds.

**Query Parameters:**
- `agency_id` (optional): Filter by agency ID
- `feed_type` (optional): Filter by feed type

**Response:**
```json
{
    "feeds": [
        {
            "feed_id": "string",
            "feed_name": "string",
            "feed_type": "static" | "realtime",
            "agency_id": "string",
            "upload_date": "string",
            "last_updated": "string",
            "status": "active" | "inactive" | "error"
        }
    ]
}
```

## Backend Configuration

### Environment Variables

```env
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/gtfs_boss
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=10

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
API_WORKERS=4
API_TIMEOUT=30

# GTFS Configuration
GTFS_CACHE_DIR=/path/to/cache
GTFS_CACHE_TTL=3600
GTFS_MAX_FEED_SIZE=100000000

# Security
API_KEY_HEADER=X-API-Key
API_KEY_REQUIRED=true
CORS_ORIGINS=["http://localhost:3000"]

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=json
LOG_FILE=/path/to/logs/gtfs_boss.log
```

### Database Schema

#### GTFS Feeds
```sql
CREATE TABLE gtfs_feeds (
    id SERIAL PRIMARY KEY,
    feed_name VARCHAR(255) NOT NULL,
    feed_type VARCHAR(50) NOT NULL,
    agency_id VARCHAR(255) NOT NULL,
    upload_date TIMESTAMP NOT NULL,
    last_updated TIMESTAMP NOT NULL,
    status VARCHAR(50) NOT NULL,
    validation_status JSONB,
    feed_data BYTEA
);
```

#### Validation Results
```sql
CREATE TABLE validation_results (
    id SERIAL PRIMARY KEY,
    feed_id INTEGER REFERENCES gtfs_feeds(id),
    validation_date TIMESTAMP NOT NULL,
    validation_level VARCHAR(50) NOT NULL,
    results JSONB NOT NULL
);
```

### Error Handling

The API uses standard HTTP status codes and returns error responses in the following format:

```json
{
    "error": {
        "code": "string",
        "message": "string",
        "details": {}
    }
}
```

Common error codes:
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 422: Validation Error
- 500: Internal Server Error

### Rate Limiting

The API implements rate limiting to prevent abuse:
- 100 requests per minute per IP address
- 1000 requests per hour per API key
- Burst allowance of 20 requests per second

### Caching

The backend implements caching for:
- GTFS feed data (TTL: 1 hour)
- Validation results (TTL: 24 hours)
- Real-time data (TTL: 30 seconds)

## Development Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up the database:
```bash
alembic upgrade head
```

4. Run the development server:
```bash
uvicorn gtfs_boss.main:app --reload
```

## Testing

Run the test suite:
```bash
pytest
```

Run specific test categories:
```bash
pytest tests/unit/
pytest tests/integration/
pytest tests/e2e/
```

## Monitoring

The backend includes monitoring endpoints:

- `/health`: Health check endpoint
- `/metrics`: Prometheus metrics endpoint
- `/debug`: Debug information (development only)

## Security Considerations

1. API Key Authentication
2. CORS Configuration
3. Rate Limiting
4. Input Validation
5. SQL Injection Prevention
6. File Upload Restrictions
7. Error Message Sanitization 
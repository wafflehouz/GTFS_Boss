# GTFS Boss Prototype Specifications

## 1. Core Requirements

- **Static GTFS Validation**: Check for syntax, required files/fields, and logical consistency (e.g., valid service_id references).
- **Real-Time GTFS Ingestion**: Parse and validate real-time feeds (GTFS-RT) against their static counterparts.
- **Visualization**: Map routes/stops, compare real-time vs. scheduled data, and preview proposed changes.
- **User-Friendly Interface**: Web-based or CLI, with clear error reporting.

## 2. Tech Stack Recommendations

### Backend
- **Language**: Python (popular for GTFS tools, with libraries like gtfs_kit, partridge, and gtfs-realtime-bindings)
- **Framework**: FastAPI (for REST endpoints) or Django (if you need a full-stack app)
- **Database**: PostgreSQL + PostGIS (for geospatial queries) or SQLite (prototyping)
- **Real-Time Processing**: Use confluent-kafka or Redis for streaming if needed

### Frontend
- **Map Visualization**: Leaflet, Mapbox GL JS, or Deck.gl
- **Framework**: React (flexibility) or Svelte (simplicity)
- **Charts**: D3.js or Plotly for timelines/analytics

### Validation Tools
Reuse or extend existing validators like MobilityData's GTFS Validator (Java-based, but you can wrap it in Python).

## 3. Prototype Phase

### Step 1: Static GTFS Validation
Use gtfs_kit to parse static GTFS (e.g., stops.txt, trips.txt).

Validate against GTFS specifications:
- Check for missing required files/fields
- Validate foreign keys (e.g., trip.service_id exists in calendar.txt)
- Detect duplicate IDs or invalid coordinates
- Output validation results as JSON/CSV

Sample Code:
```python
import gtfs_kit as gk

feed = gk.read_feed("gtfs.zip", dist_units="km")
errors = []
# Example: Check for trips without a service_id
if feed.trips.empty or "service_id" not in feed.trips.columns:
    errors.append("Missing service_id in trips.txt")
```

### Step 2: Real-Time GTFS Ingestion
Use Google's gtfs-realtime-bindings (Python) to parse real-time data (vehicle positions, trip updates).

Validate real-time feeds against their static GTFS:
- Ensure trip_id in real-time feeds exists in the static trips.txt
- Check for timestamps in the future

Sample Code:
```python
from google.transit import gtfs_realtime_pb2

with open("rt_feed.pb", "rb") as f:
    feed = gtfs_realtime_pb2.FeedMessage()
    feed.ParseFromString(f.read())
    for entity in feed.entity:
        if not entity.HasField("trip_update"):
            continue
        trip_id = entity.trip_update.trip.trip_id
        if trip_id not in static_feed.trips.trip_id:
            errors.append(f"Invalid trip_id in real-time feed: {trip_id}")
```

### Step 3: Basic Visualization
Use Leaflet to plot static routes/stops and real-time vehicle positions.

Example:
```javascript
// In React/JS
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
const routesGeoJSON = convertGtfsToGeoJSON(staticFeed);
<MapContainer center={[lat, lon]} zoom={13}>
  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
  <GeoJSON data={routesGeoJSON} />
</MapContainer>
```

### Step 4: Simple UI
Build a web interface with:
- File upload for static/real-time feeds
- Toggle between map and validation reports
- Side-by-side comparison of original vs. modified GTFS

## 4. Scaling to a Robust Tool

### Advanced Features
- **Diff Tool**: Highlight changes between GTFS versions (e.g., added stops, modified schedules)
- **Performance Metrics**: Calculate on-time adherence, headway regularity
- **API Integration**: Fetch feeds directly from URLs (e.g., https://agency.com/gtfs.zip)
- **User Authentication**: Let agencies save/share feed configurations

### Performance
- Optimize large GTFS parsing with lazy loading or chunking
- Use a task queue (e.g., Celery) for background validation jobs

### Community Adoption
- **Open-Source**: Host on GitHub with clear docs and a Docker setup
- **Extensibility**: Allow plugins for custom validation rules (e.g., agency-specific policies)
- **Precommit Hooks**: Integrate with GitHub Actions for automated validation on PRs

## 5. Existing Tools to Leverage
- **Validation**: Integrate MobilityData's validator via its HTTP API
- **Data Storage**: Use Transitland's Datastore or MBTA GTFS-Manager for inspiration
- **UI Components**: Reuse TransitComponent React modules

## 6. Example Workflow
1. Upload Static GTFS: User uploads gtfs.zip or provides a URL
2. Validate: Backend checks for errors/warnings and generates a report
3. Visualize: Show routes on a map with real-time vehicle positions
4. Modify & Preview: User edits stops.txt and previews changes on the map
5. Compare: Side-by-side analysis of old vs. new schedules

## 7. Deployment
- Use Docker Compose for easy setup (Python backend + React frontend + PostgreSQL)
- Deploy on Heroku, AWS, or Railway for public access

## 8. Challenges to Anticipate
- **Large Feeds**: Optimize memory usage (e.g., use DuckDB for SQL-based GTFS queries)
- **Real-Time Latency**: Use WebSockets or Server-Sent Events (SSE) for live updates
- **GTFS-RT Variability**: Agencies may implement real-time feeds differently
import logging
import traceback

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, Any
import tempfile
import os
import gtfs_kit as gk
import pandas as pd # Import pandas for DataFrame checks
from ..core.validator import GTFSValidator
from ..core.report_generator import GTFSReportGenerator
from io import StringIO
from ..realtime.processor import fetch_and_parse_realtime_feed
import shutil
import json # Import json for GeoJSON response
from ..utils.download_feed import download_gtfs_feed
from pathlib import Path # Import Path
import time # Import time for timestamp handling

router = APIRouter()

# Global variable to store the last validated feed object
last_validated_feed: Optional[gk.Feed] = None

# Define the directory for storing uploaded feeds using relative path
UPLOAD_DIR = Path("data/uploaded_feeds")

# Ensure the upload directory exists on startup
@router.on_event("startup")
async def startup_event():
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    # Attempt to load a previously uploaded feed on startup
    persistent_feed_path = UPLOAD_DIR / "current_feed.zip"
    if persistent_feed_path.exists():
        try:
            global last_validated_feed
            feed = gk.read_feed(str(persistent_feed_path), dist_units='km')
            if feed is not None:
                last_validated_feed = feed
                # logger.info(f"Loaded persistent feed from {persistent_feed_path}") # Reduced log
            else:
                 logger.warning(f"Failed to read persistent feed from {persistent_feed_path}")
        except Exception as e:
            logger.error(f"Error loading persistent feed on startup: {e}")

# Add CORS middleware to this router if it were standalone, but we add it to the main app
# router.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://localhost:5173"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

@router.post("/validate")
async def validate_gtfs(
    file: UploadFile = File(...),
    format: str = "json"
) -> Any:
    """Validate a GTFS feed file and return validation results."""
    if not file.filename.endswith('.zip'):
        raise HTTPException(status_code=400, detail="Only ZIP files are accepted")

    temp_file_path = None
    persistent_feed_path = UPLOAD_DIR / "current_feed.zip"
    global last_validated_feed # Declare use of global variable
    try:
        # Save uploaded file temporarily
        # Use a more robust temporary file handling with a known suffix
        with tempfile.NamedTemporaryFile(delete=False, suffix='.zip') as temp_file:
             content = await file.read()
             temp_file.write(content)
             temp_file_path = Path(temp_file.name)

        # Read and validate the feed
        try:
            feed = gk.read_feed(str(temp_file_path), dist_units='km')
            if feed is None:
                logger.error("gtfs_kit.read_feed returned None")
                raise HTTPException(status_code=400, detail="Failed to read GTFS feed: Feed is None")

            # Store the successfully loaded feed in the global variable
            last_validated_feed = feed

            # Save the uploaded file to the persistent storage location
            shutil.copy(temp_file_path, persistent_feed_path)
            # logger.info(f"Saved uploaded feed to {persistent_feed_path}") # Reduced log

            validator = GTFSValidator()
            validation_results = validator.validate_feed(feed)

            # Generate report
            try:
                report_generator = GTFSReportGenerator(feed)
                report = report_generator.generate_report(validation_results)

                # Return results in requested format
                if format.lower() == "csv":
                    csv_content = report_generator.export_csv(report)
                    return StreamingResponse(
                        iter([csv_content]),
                        media_type="text/csv",
                        headers={"Content-Disposition": f"attachment; filename=validation_report.csv"}
                    )

                # Return validation results in the format expected by the frontend
                return {
                    "is_valid": validation_results["is_valid"],
                    "errors": validation_results["errors"],
                    "warnings": validation_results["warnings"],
                    "feed_info": report["feed_info"],
                    "metrics": report["metrics"],
                    "summary": report["summary"]
                }
            except ValueError as e:
                raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")

        except Exception as e:
            # Log the full traceback for better debugging
            logger.error(f"An error occurred during GTFS validation: {e}\n{traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")

    except Exception as e:
        logger.error(f"An error occurred during file processing: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"File processing failed: {str(e)}")

    finally:
        # Clean up temporary file
        if temp_file_path and temp_file_path.exists():
            os.unlink(temp_file_path)

def get_time_seconds(time_str):
    """Converts HH:MM:SS time string to seconds since midnight."""
    if pd.isna(time_str):
        return None
    try:
        # Split into hours, minutes, seconds
        parts = list(map(int, time_str.split(':')))
        if len(parts) == 3:
             h, m, s = parts
        elif len(parts) == 2: # Handle MM:SS format if necessary, though HH:MM:SS is standard
             h, m = parts
             s = 0
        else:
             logger.warning(f"Unexpected time format: {time_str}")
             return None
        return h * 3600 + m * 60 + s
    except ValueError:
        logger.warning(f"Could not parse time string to int: {time_str}")
        return None
    except Exception as e:
        logger.error(f"Error in get_time_seconds for {time_str}: {e}")
        return None

@router.get("/realtime/vehicles")
async def get_realtime_vehicles():
    """
    Get real-time vehicle locations from Valley Metro's GTFS-RT Vehicle Positions feed
    and merge with schedule adherence data from the Trip Updates feed.
    """
    try:
        # URLs for Valley Metro's GTFS-RT feeds
        vehicle_positions_url = "https://mna.mecatran.com/utw/ws/gtfsfeed/vehicles/valleymetro?apiKey=4f22263f69671d7f49726c3011333e527368211f&asJson=true"
        trip_updates_url = "https://mna.mecatran.com/utw/ws/gtfsfeed/realtime/valleymetro?apiKey=4f22263f69671d7f49726c3011333e527368211f&asJson=true"
        service_alerts_url = "https://mna.mecatran.com/utw/ws/gtfsfeed/alerts/valleymetro?apiKey=4f22263f69671d7f49726c3011333e527368211f&asJson=true"

        # Fetch and parse the Vehicle Positions feed
        vehicle_positions_data = fetch_and_parse_realtime_feed(vehicle_positions_url)
        if vehicle_positions_data is None:
            logger.error("fetch_and_parse_realtime_feed for vehicle positions returned None")
            raise HTTPException(status_code=500, detail="Failed to fetch or parse real-time vehicle position data")

        # Fetch and parse the Trip Updates feed
        trip_updates_data = fetch_and_parse_realtime_feed(trip_updates_url)
        if trip_updates_data is None:
            logger.error("fetch_and_parse_realtime_feed for trip updates returned None")
            raise HTTPException(status_code=500, detail="Failed to fetch or parse real-time trip update data")

        # Fetch and parse the Service Alerts feed
        service_alerts_data = fetch_and_parse_realtime_feed(service_alerts_url)
        if service_alerts_data is None:
            logger.error("fetch_and_parse_realtime_feed for service alerts returned None")
            raise HTTPException(status_code=500, detail="Failed to fetch or parse real-time service alert data")

        # Use the timestamp from the vehicle positions feed for consistency
        realtime_timestamp = vehicle_positions_data.get('header', {}).get('timestamp')

        # --- Extract Vehicle Positions ---
        vehicle_positions = []
        if 'entity' in vehicle_positions_data:
            # logger.info(f"Found {len(vehicle_positions_data.get('entity', []))} entities in Vehicle Positions feed.") # Reduced log
            for entity in vehicle_positions_data['entity']:
                if 'vehicle' in entity:
                    vehicle = entity['vehicle']
                    vehicle_id = vehicle.get('vehicle', {}).get('id')
                    vehicle_label = vehicle.get('vehicle', {}).get('label')
                    position = vehicle.get('position', {})
                    latitude = position.get('latitude')
                    longitude = position.get('longitude')
                    bearing = position.get('bearing')
                    speed = position.get('speed')
                    current_status = vehicle.get('currentStatus')
                    stop_id = vehicle.get('stopId')
                    trip_info = vehicle.get('trip', {})
                    trip_id = trip_info.get('tripId')
                    route_id = trip_info.get('routeId')
                    direction_id = trip_info.get('directionId')
                    congestion_level = vehicle.get('congestionLevel')
                    occupancy_status = vehicle.get('occupancyStatus')

                    # Only process vehicle if required position data and trip_id are available
                    if latitude is not None and longitude is not None and trip_id is not None:
                        vehicle_positions.append({
                            'id': vehicle_id,
                            'label': vehicle_label,
                            'position': {
                                'latitude': latitude,
                                'longitude': longitude,
                                'bearing': bearing,
                                'speed': speed
                            },
                            'currentStatus': current_status,
                            'stopId': stop_id,
                            'congestionLevel': congestion_level,
                            'occupancyStatus': occupancy_status,
                            'trip': {
                                'tripId': trip_id,
                                'routeId': route_id,
                                'directionId': direction_id
                            },
                            'scheduleDeviation': None # Will be populated from trip updates
                        })
        else:
            logger.warning("'entity' key not found in vehicle_positions_data or is empty.")

        # logger.info(f"Extracted {len(vehicle_positions)} vehicles with position and trip_id from Vehicle Positions feed.") # Reduced log

        # --- Extract Schedule Deviations from Trip Updates ---
        trip_deviations = {} # Map trip_id to deviation
        if 'entity' in trip_updates_data:
            # logger.info(f"Found {len(trip_updates_data.get('entity', []))} entities in Trip Updates feed.") # Reduced log
            # Log a few sample trip update entities to inspect structure
            # for i, entity in enumerate(trip_updates_data['entity'][:5]): # Reduced log
            #     if 'tripUpdate' in entity: # Reduced log
            #         logger.info(f"Sample Trip Update Entity {i}: {json.dumps(entity.get('tripUpdate'), indent=2)}") # Reduced log

            for entity in trip_updates_data['entity']:
                if 'tripUpdate' in entity:
                    trip_update = entity['tripUpdate']
                    trip_info_rt = trip_update.get('trip', {})
                    trip_id = trip_info_rt.get('tripId')

                    # Find the latest schedule deviation from stop time updates
                    deviation = None
                    if 'stopTimeUpdate' in trip_update:
                        stop_time_updates = sorted(trip_update['stopTimeUpdate'], key=lambda x: x.get('stopSequence', 0))
                        for stop_time_update in reversed(stop_time_updates):
                            if 'scheduleDeviation' in stop_time_update:
                                reported_deviation = stop_time_update['scheduleDeviation']
                                try:
                                    deviation = int(reported_deviation)
                                    break
                                except (ValueError, TypeError):
                                    logger.warning(f"Could not convert reported scheduleDeviation {reported_deviation} to integer for trip {trip_id}.")
                                    deviation = None
                            # If scheduleDeviation is not present, check for 'delay' nested within arrival or departure
                            elif 'arrival' in stop_time_update and 'delay' in stop_time_update['arrival']:
                                reported_delay = stop_time_update['arrival']['delay']
                                try:
                                    deviation = int(reported_delay)
                                    break
                                except (ValueError, TypeError):
                                    logger.warning(f"Could not convert reported delay in arrival object {reported_delay} to integer for trip {trip_id}.")
                                    deviation = None
                            elif 'departure' in stop_time_update and 'delay' in stop_time_update['departure']:
                                reported_delay = stop_time_update['departure']['delay']
                                try:
                                    deviation = int(reported_delay)
                                    break
                                except (ValueError, TypeError):
                                    logger.warning(f"Could not convert reported delay in departure object {reported_delay} to integer for trip {trip_id}.")
                                    deviation = None

                    if trip_id is not None and deviation is not None:
                        trip_deviations[trip_id] = deviation
        else:
            logger.warning("'entity' key not found in trip_updates_data or is empty.")

        # logger.info(f"Extracted {len(trip_deviations)} schedule deviations from Trip Updates feed.") # Reduced log
        # Log the extracted deviations to inspect
        # logger.info(f"Extracted Deviations (first 10): {list(trip_deviations.items())[:10]}") # Reduced log

        # --- Merge Vehicle Positions with Schedule Deviations ---
        merged_vehicles = []
        total_vehicles_with_deviation = 0
        on_time_vehicles = 0
        total_early_deviation = 0
        total_late_deviation = 0
        early_vehicles_count = 0
        late_vehicles_count = 0
        vehicles_with_deviation_list = [] # List to store vehicles that received deviation

        # Define the on-time window in seconds
        ON_TIME_EARLY_THRESHOLD = -60
        ON_TIME_LATE_THRESHOLD = 300

        for vehicle in vehicle_positions:
            trip_id = vehicle['trip']['tripId']
            if trip_id in trip_deviations:
                deviation = trip_deviations[trip_id]
                vehicle['scheduleDeviation'] = deviation

                # Calculate metrics
                total_vehicles_with_deviation += 1
                if deviation >= ON_TIME_EARLY_THRESHOLD and deviation <= ON_TIME_LATE_THRESHOLD:
                    on_time_vehicles += 1
                elif deviation < ON_TIME_EARLY_THRESHOLD:
                    total_early_deviation += abs(deviation)
                    early_vehicles_count += 1
                elif deviation > ON_TIME_LATE_THRESHOLD:
                    total_late_deviation += deviation
                    late_vehicles_count += 1
                vehicles_with_deviation_list.append(vehicle) # Add vehicle to list if it got a deviation

            merged_vehicles.append(vehicle)

        # logger.info(f"Attempted to merge deviations with {len(vehicle_positions)} vehicle positions.") # Reduced log
        # logger.info(f"Successfully merged deviation for {total_vehicles_with_deviation} vehicles.") # Reduced log

        # --- Calculate Real-time Performance Metrics ---
        # Ensure calculations use only vehicles that received a deviation
        early_deviations = [v['scheduleDeviation'] for v in vehicles_with_deviation_list if v.get('scheduleDeviation') is not None and v['scheduleDeviation'] < ON_TIME_EARLY_THRESHOLD]
        late_deviations = [v['scheduleDeviation'] for v in vehicles_with_deviation_list if v.get('scheduleDeviation') is not None and v['scheduleDeviation'] > ON_TIME_LATE_THRESHOLD]

        on_time_percentage = (on_time_vehicles / total_vehicles_with_deviation * 100) if total_vehicles_with_deviation > 0 else 0
        average_early_deviation = (sum(abs(dev) for dev in early_deviations) / len(early_deviations)) if early_deviations else 0
        average_late_deviation = (sum(late_deviations) / len(late_deviations)) if late_deviations else 0
        average_overall_deviation = (sum(v['scheduleDeviation'] for v in vehicles_with_deviation_list if v.get('scheduleDeviation') is not None) / total_vehicles_with_deviation) if total_vehicles_with_deviation > 0 else 0

        realtime_metrics = {
            "total_vehicles_reporting_deviation": int(total_vehicles_with_deviation),
            "on_time_vehicles": int(on_time_vehicles),
            "on_time_percentage": round(float(on_time_percentage), 2),
            "early_vehicles_count": int(early_vehicles_count),
            "late_vehicles_count": int(late_vehicles_count),
            "average_early_deviation_seconds": round(float(average_early_deviation), 2),
            "average_late_deviation_seconds": round(float(average_late_deviation), 2),
            "average_overall_deviation_seconds": round(float(average_overall_deviation), 2)
        }

        # logger.info(f"Realtime Metrics: {realtime_metrics}") # Reduced log

        # --- Fetch and Process Service Alerts ---
        alerts = []
        if service_alerts_data and 'entity' in service_alerts_data:
            logger.info(f"Found {len(service_alerts_data.get('entity', []))} entities in Service Alerts feed.")
            for entity in service_alerts_data['entity']:
                if 'alert' in entity:
                    alert = entity['alert']
                    # Extract key alert information
                    alert_info = {
                        'id': entity.get('id'),
                        'cause': alert.get('cause'),
                        'effect': alert.get('effect'),
                        'url': alert.get('url', {}).get('translation', [{}])[0].get('text') if alert.get('url') else None,
                        'headerText': alert.get('headerText', {}).get('translation', [{}])[0].get('text') if alert.get('headerText') else None,
                        'descriptionText': alert.get('descriptionText', {}).get('translation', [{}])[0].get('text') if alert.get('descriptionText') else None,
                        'informedEntities': alert.get('informedEntity', []) # List of affected entities
                    }
                    alerts.append(alert_info)
        else:
            logger.warning("'entity' key not found in service_alerts_data or is empty.")

        logger.info(f"Extracted {len(alerts)} service alerts.")

        return JSONResponse(
            content={
                "status": "success",
                "timestamp": realtime_timestamp,
                "vehicleCount": len(merged_vehicles),
                "vehicles": merged_vehicles,
                "realtimeMetrics": realtime_metrics,
                "alerts": alerts
            },
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            }
        )

    except Exception as e:
        logger.error(f"An error occurred in get_realtime_vehicles: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {e}")

@router.get("/routes/geometry")
async def get_route_geometry():
    """
    Get static GTFS route geometry and colors from the last validated feed.
    """
    global last_validated_feed # Declare use of global variable
    
    if last_validated_feed is None:
        raise HTTPException(status_code=404, detail="No GTFS feed has been validated yet.")

    feed = last_validated_feed

    # Check if required files are in the feed
    if not hasattr(feed, 'routes') or feed.routes is None or feed.routes.empty or \
       not hasattr(feed, 'shapes') or feed.shapes is None or feed.shapes.empty or \
       not hasattr(feed, 'trips') or feed.trips is None or feed.trips.empty:
        raise HTTPException(status_code=404, detail="Required data (routes.txt, shapes.txt, or trips.txt) not available in the validated feed.")

    try:
        # Get shapes data
        shapes_df = feed.shapes
        # Get routes data
        routes_df = feed.routes
        # Get trips data
        trips_df = feed.trips

        # Create a mapping from shape_id to route information using trips.txt
        # This handles cases where multiple trips use the same shape
        shape_to_route_info = {}
        # Merge trips and routes to easily get route info for each trip's shape
        trips_with_route_info = pd.merge(
            trips_df[['trip_id', 'route_id', 'shape_id']],
            routes_df[['route_id', 'route_color', 'route_short_name']],
            on='route_id',
            how='left'
        )
        
        # Iterate through trips_with_route_info and build the shape_to_route_info map
        # Prioritize the first trip encountered for a given shape_id, assuming consistent route info per shape
        for _, row in trips_with_route_info.iterrows():
            shape_id = row.get('shape_id')
            route_color = row.get('route_color')
            route_short_name = row.get('route_short_name')

            if shape_id is not None and shape_id not in shape_to_route_info:
                 shape_to_route_info[shape_id] = {
                    'route_id': row.get('route_id'),
                    'route_color': route_color if pd.notna(route_color) else None,
                    'route_short_name': route_short_name if pd.notna(route_short_name) else None
                }

        # Create a GeoJSON FeatureCollection
        features = []

        # Group shapes by shape_id
        # Use iterrows for pandas DataFrame iteration
        for shape_id, shape_group in shapes_df.groupby('shape_id'):
            # Sort by shape_pt_sequence
            shape_group = shape_group.sort_values('shape_pt_sequence')

            # Create LineString coordinates
            coordinates = [[row['shape_pt_lon'], row['shape_pt_lat']]
                           for _, row in shape_group.iterrows()]

            # Get route information for the current shape_id
            route_info = shape_to_route_info.get(shape_id, {})

            # Format route color - ensure it starts with # and is a valid hex color
            route_color = route_info.get('route_color')
            if route_color and pd.notna(route_color):
                # Remove any existing # prefix
                route_color = str(route_color).strip('#')
                # Ensure it's a valid hex color (6 characters)
                if len(route_color) == 6:
                    route_color = f"#{route_color}"
                else:
                    route_color = "#000000"  # Default to black if invalid
            else:
                route_color = "#000000"  # Default to black if no color

            # Create feature
            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": coordinates
                },
                "properties": {
                    "shape_id": shape_id, # Include shape_id for potential debugging
                    "route_id": route_info.get('route_id'),
                    "route_color": route_color,
                    "route_short_name": route_info.get('route_short_name')
                }
            }
            features.append(feature)

        geojson = {
            "type": "FeatureCollection",
            "features": features
        }

        return JSONResponse(content=geojson)

    except Exception as e:
        logger.error(f"An error occurred while generating route geometry: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error while processing route geometry: {e}")

@router.post("/routes/geometry/url")
async def get_route_geometry_from_url(url: str):
    """
    Get route geometry from a GTFS feed URL.
    """
    try:
        # Download and load the feed
        with tempfile.TemporaryDirectory() as temp_dir:
            feed_path = download_gtfs_feed(url, temp_dir)
            validator = GTFSValidator()
            feed = validator.load_feed(feed_path)
            
            if feed is None:
                raise HTTPException(status_code=404, detail="Failed to load GTFS feed")
            
            # Get shapes and routes data
            shapes_df = feed.shapes
            routes_df = feed.routes
            
            if shapes_df is None or routes_df is None:
                raise HTTPException(status_code=404, detail="Required GTFS files (shapes.txt or routes.txt) not found")
            
            # Create a GeoJSON FeatureCollection
            features = []
            
            # Group shapes by shape_id
            for shape_id, shape_group in shapes_df.groupby('shape_id'):
                # Sort by shape_pt_sequence
                shape_group = shape_group.sort_values('shape_pt_sequence')
                
                # Create LineString coordinates
                coordinates = [[row['shape_pt_lon'], row['shape_pt_lat']] 
                             for _, row in shape_group.iterrows()]
                
                # Find matching route
                route_info = routes_df[routes_df['route_id'] == shape_id].iloc[0] if not routes_df[routes_df['route_id'] == shape_id].empty else None
                
                # Create feature
                feature = {
                    "type": "Feature",
                    "geometry": {
                        "type": "LineString",
                        "coordinates": coordinates
                    },
                    "properties": {
                        "route_id": shape_id,
                        "route_color": route_info['route_color'] if route_info is not None else None,
                        "route_short_name": route_info['route_short_name'] if route_info is not None else None
                    }
                }
                features.append(feature)
            
            geojson = {
                "type": "FeatureCollection",
                "features": features
            }
            
            return geojson
            
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"An error occurred while generating route geometry from URL: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 

@router.get("/report")
async def get_validation_report(format: str = "json"):
    """Get the validation report for the last validated feed."""
    global last_validated_feed

    if last_validated_feed is None:
        raise HTTPException(status_code=404, detail="No GTFS feed has been validated yet.")

    feed = last_validated_feed

    try:
        # Assume validation_results are stored or can be regenerated quickly from the stored feed
        # For simplicity, we'll just regenerate the report structure here.
        # In a more complex app, you might store the validation_results too.
        validator = GTFSValidator()
        # Note: This re-runs validation, which might be slow. A better approach for a production app
        # would be to store the results after the initial validation.
        validation_results = validator.validate_feed(feed)

        report_generator = GTFSReportGenerator(feed)
        report = report_generator.generate_report(validation_results)

        if format.lower() == "csv":
            csv_content = report_generator.export_csv(report)
            return StreamingResponse(
                iter([csv_content]),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename=validation_report.csv"}
            )

        # Default to JSON
        return JSONResponse(content=report)

    except Exception as e:
        logger.error(f"An error occurred while generating report: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error while generating report: {e}") 

@router.get("/stops/geometry")
async def get_stop_geometry():
    """Get static GTFS stop geometry from the last validated feed."""
    global last_validated_feed

    if last_validated_feed is None:
        raise HTTPException(status_code=404, detail="No GTFS feed has been validated yet.")

    feed = last_validated_feed

    # Check if stops.txt is in the feed
    if not hasattr(feed, 'stops') or feed.stops is None or feed.stops.empty:
        raise HTTPException(status_code=404, detail="Stops data (stops.txt) not available in the validated feed.")

    try:
        stops_df = feed.stops

        # Create a GeoJSON FeatureCollection for stops
        features = []
        for _, stop in stops_df.iterrows():
            # Ensure required fields exist and are not None
            if pd.notna(stop['stop_lon']) and pd.notna(stop['stop_lat']):
                 feature = {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [float(stop['stop_lon']), float(stop['stop_lat'])] # Ensure floats
                    },
                    "properties": {
                        "stop_id": stop.get('stop_id') if pd.notna(stop.get('stop_id')) else None,
                        "stop_code": stop.get('stop_code') if pd.notna(stop.get('stop_code')) else None,
                        "stop_name": stop.get('stop_name') if pd.notna(stop.get('stop_name')) else None,
                        "stop_desc": stop.get('stop_desc') if pd.notna(stop.get('stop_desc')) else None,
                        # Add other relevant stop fields as needed, remember to handle NA/NaN
                    }
                }
                 features.append(feature)

        geojson = {
            "type": "FeatureCollection",
            "features": features
        }

        return JSONResponse(content=geojson)

    except Exception as e:
        logger.error(f"An error occurred while generating stop geometry: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error while processing stop geometry: {e}") 
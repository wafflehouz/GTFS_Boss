from typing import List, Dict, Any
import gtfs_kit as gk
from pathlib import Path
import pandas as pd

class GTFSValidator:
    def __init__(self):
        self.errors: List[Dict[str, Any]] = []
        self.warnings: List[Dict[str, Any]] = []

    def validate_feed(self, feed: gk.Feed) -> Dict[str, Any]:
        """
        Validate a GTFS feed and return validation results.
        
        Args:
            feed: GTFS feed object to validate
            
        Returns:
            Dict containing validation results including errors and warnings
        """
        try:
            # Reset validation state
            self.errors = []
            self.warnings = []
            
            # Validate required files
            self._validate_required_files(feed)
            
            # Only run these validations if we have the required files
            if len(self.errors) == 0:
                self._validate_foreign_keys(feed)
                self._validate_coordinates(feed)
            
            return {
                "is_valid": len(self.errors) == 0,
                "errors": self.errors,
                "warnings": self.warnings
            }
        except Exception as e:
            return {
                "is_valid": False,
                "errors": [{"message": f"Failed to validate feed: {str(e)}"}],
                "warnings": []
            }

    def _validate_required_files(self, feed: gk.Feed) -> None:
        """Check for required GTFS files."""
        required_files = ["agency.txt", "stops.txt", "routes.txt", "trips.txt", "stop_times.txt"]
        
        for file in required_files:
            attr_name = file.replace(".txt", "")
            if not hasattr(feed, attr_name):
                self.errors.append({
                    "type": "missing_file",
                    "file": file,
                    "message": f"Required file {file} is missing"
                })
            else:
                # Check if the file exists but is None or empty
                file_data = getattr(feed, attr_name)
                if file_data is None:
                    self.errors.append({
                        "type": "empty_file",
                        "file": file,
                        "message": f"Required file {file} is empty or invalid"
                    })
                elif isinstance(file_data, pd.DataFrame):
                    if file_data.empty:
                        self.errors.append({
                            "type": "empty_file",
                            "file": file,
                            "message": f"Required file {file} contains no data"
                        })
                elif isinstance(file_data, tuple) and len(file_data) == 2:
                    # Handle case where file_data is a tuple of (rows, columns)
                    if file_data[0] == 0:  # No rows
                        self.errors.append({
                            "type": "empty_file",
                            "file": file,
                            "message": f"Required file {file} contains no data"
                        })
                else:
                    self.errors.append({
                        "type": "invalid_file",
                        "file": file,
                        "message": f"Required file {file} is not a valid DataFrame or tuple"
                    })

    def _validate_foreign_keys(self, feed: gk.Feed) -> None:
        """Validate foreign key relationships."""
        # Check trip.service_id references against calendar and/or calendar_dates
        if hasattr(feed, "trips") and feed.trips is not None and not feed.trips.empty:
            service_ids_in_trips = set(feed.trips.service_id)
            service_ids_in_calendar = set()
            service_ids_in_calendar_dates = set()
            
            # Check calendar.txt
            has_calendar = (
                hasattr(feed, "calendar") and 
                feed.calendar is not None and 
                not feed.calendar.empty and 
                'service_id' in feed.calendar.columns
            )
            
            # Check calendar_dates.txt
            has_calendar_dates = (
                hasattr(feed, "calendar_dates") and 
                feed.calendar_dates is not None and 
                not feed.calendar_dates.empty and 
                'service_id' in feed.calendar_dates.columns
            )

            if has_calendar:
                service_ids_in_calendar = set(feed.calendar.service_id)
            if has_calendar_dates:
                service_ids_in_calendar_dates = set(feed.calendar_dates.service_id)

            # Only raise error if neither calendar nor calendar_dates are present
            if not has_calendar and not has_calendar_dates:
                self.errors.append({
                    "type": "missing_file",
                    "file": "calendar.txt/calendar_dates.txt",
                    "message": "Both calendar.txt and calendar_dates.txt are missing or invalid, cannot validate service_id references."
                })
            else:
                # Check if all service_ids in trips are present in at least one of the two
                valid_service_ids = service_ids_in_calendar.union(service_ids_in_calendar_dates)
                invalid_service_ids = service_ids_in_trips - valid_service_ids
                if invalid_service_ids:
                    self.errors.append({
                        "type": "foreign_key",
                        "message": f"Invalid service_id references in trips.txt: {invalid_service_ids}"
                    })

        # Check trip.route_id references
        if (hasattr(feed, "trips") and feed.trips is not None and not feed.trips.empty and
            hasattr(feed, "routes") and feed.routes is not None and not feed.routes.empty and
            'route_id' in feed.trips.columns and 'route_id' in feed.routes.columns):
            
            invalid_route_ids = set(feed.trips.route_id) - set(feed.routes.route_id)
            if invalid_route_ids:
                self.errors.append({
                    "type": "foreign_key",
                    "message": f"Invalid route_id references in trips.txt: {invalid_route_ids}"
                })

    def _validate_coordinates(self, feed: gk.Feed) -> None:
        """Validate stop coordinates."""
        if (hasattr(feed, "stops") and 
            feed.stops is not None and 
            not feed.stops.empty and 
            'stop_lat' in feed.stops.columns and 
            'stop_lon' in feed.stops.columns and 
            'stop_id' in feed.stops.columns):
            
            # Filter out rows with missing coordinates
            valid_stops = feed.stops.dropna(subset=['stop_lat', 'stop_lon'])
            
            if not valid_stops.empty:
                invalid_coords = valid_stops[
                    (valid_stops.stop_lat < -90) | 
                    (valid_stops.stop_lat > 90) | 
                    (valid_stops.stop_lon < -180) | 
                    (valid_stops.stop_lon > 180)
                ]
                
                if not invalid_coords.empty:
                    self.errors.append({
                        "type": "coordinates",
                        "message": f"Invalid coordinates found in stops.txt: {invalid_coords.stop_id.tolist()}"
                    }) 
from typing import Dict, List, Any
import json
import csv
from io import StringIO
from datetime import datetime
import gtfs_kit as gk
import pandas as pd

class GTFSReportGenerator:
    """Generates comprehensive validation reports for GTFS feeds."""
    
    def __init__(self, feed: gk.Feed):
        if feed is None:
            raise ValueError("Feed object cannot be None")
        self.feed = feed
        self.metrics = {}
        self.validation_results = {}
        
    def generate_report(self, validation_results: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a comprehensive report including metrics and validation results."""
        if validation_results is None:
            validation_results = {
                "is_valid": False,
                "errors": [{"message": "No validation results provided"}],
                "warnings": []
            }
            
        self.validation_results = validation_results
        self._calculate_metrics()
        
        return {
            "timestamp": datetime.now().isoformat(),
            "feed_info": self._get_feed_info(),
            "metrics": self.metrics,
            "validation_results": validation_results,
            "summary": self._generate_summary()
        }
    
    def _calculate_metrics(self) -> None:
        """Calculate specified metrics from the feed."""
        self.metrics = {
            "Counts": {
                "Agencies": 0,
                "Routes": 0,
                "Trips": 0,
                "Stops": 0,
                "Stations": 0,
                "Entrances": 0,
                "Generic nodes": 0,
                "Boarding areas": 0,
                "Pathways": 0,
                "Levels": 0,
                "Shapes": 0,
                "Transfers": 0,
                "Service Periods": 0,
                "Fare Attributes": 0
            },
            "Service Dates": self._calculate_service_coverage(),
            # Feed Info is handled separately in _get_feed_info
        }

        # Calculate counts
        if hasattr(self.feed, 'agency') and self.feed.agency is not None and isinstance(self.feed.agency, pd.DataFrame) and not self.feed.agency.empty:
            self.metrics["Counts"]["Agencies"] = len(self.feed.agency)
        if hasattr(self.feed, 'routes') and self.feed.routes is not None and isinstance(self.feed.routes, pd.DataFrame) and not self.feed.routes.empty:
            self.metrics["Counts"]["Routes"] = len(self.feed.routes)
        if hasattr(self.feed, 'trips') and self.feed.trips is not None and isinstance(self.feed.trips, pd.DataFrame) and not self.feed.trips.empty:
            self.metrics["Counts"]["Trips"] = len(self.feed.trips)

        if hasattr(self.feed, 'stops') and self.feed.stops is not None and isinstance(self.feed.stops, pd.DataFrame) and not self.feed.stops.empty:
            self.metrics["Counts"]["Stops"] = len(self.feed.stops)
            # Count Stations, Entrances, Generic nodes, Boarding areas using location_type
            if 'location_type' in self.feed.stops.columns:
                self.metrics["Counts"]["Stations"] = len(self.feed.stops[self.feed.stops['location_type'] == 1])
                self.metrics["Counts"]["Entrances"] = len(self.feed.stops[self.feed.stops['location_type'] == 2])
                self.metrics["Counts"]["Generic nodes"] = len(self.feed.stops[self.feed.stops['location_type'] == 3])
                self.metrics["Counts"]["Boarding areas"] = len(self.feed.stops[self.feed.stops['location_type'] == 4])

        if hasattr(self.feed, 'shapes') and self.feed.shapes is not None and isinstance(self.feed.shapes, pd.DataFrame) and not self.feed.shapes.empty:
             # Note: gtfs_kit reads shapes into a single DataFrame, need to count unique shape_ids
             if 'shape_id' in self.feed.shapes.columns:
                 self.metrics["Counts"]["Shapes"] = self.feed.shapes['shape_id'].nunique()

        if hasattr(self.feed, 'transfers') and self.feed.transfers is not None and isinstance(self.feed.transfers, pd.DataFrame) and not self.feed.transfers.empty:
            self.metrics["Counts"]["Transfers"] = len(self.feed.transfers)

        if hasattr(self.feed, 'pathways') and self.feed.pathways is not None and isinstance(self.feed.pathways, pd.DataFrame) and not self.feed.pathways.empty:
             self.metrics["Counts"]["Pathways"] = len(self.feed.pathways)

        if hasattr(self.feed, 'levels') and self.feed.levels is not None and isinstance(self.feed.levels, pd.DataFrame) and not self.feed.levels.empty:
             self.metrics["Counts"]["Levels"] = len(self.feed.levels)

        # Count Service Periods (unique service_ids from calendar and calendar_dates)
        service_ids = set()
        if hasattr(self.feed, 'calendar') and self.feed.calendar is not None and isinstance(self.feed.calendar, pd.DataFrame) and not self.feed.calendar.empty and 'service_id' in self.feed.calendar.columns:
            service_ids.update(self.feed.calendar['service_id'].unique())
        if hasattr(self.feed, 'calendar_dates') and self.feed.calendar_dates is not None and isinstance(self.feed.calendar_dates, pd.DataFrame) and not self.feed.calendar_dates.empty and 'service_id' in self.feed.calendar_dates.columns:
             service_ids.update(self.feed.calendar_dates['service_id'].unique())
        self.metrics["Counts"]["Service Periods"] = len(service_ids)

        if hasattr(self.feed, 'fare_attributes') and self.feed.fare_attributes is not None and isinstance(self.feed.fare_attributes, pd.DataFrame) and not self.feed.fare_attributes.empty:
             self.metrics["Counts"]["Fare Attributes"] = len(self.feed.fare_attributes)

        # Extract unique route colors
        self._extract_unique_route_colors()

    def _extract_unique_route_colors(self) -> None:
        """Extract unique colors and their counts/text colors from routes.txt."""
        color_summary = []
        if hasattr(self.feed, 'routes') and self.feed.routes is not None and isinstance(self.feed.routes, pd.DataFrame) and not self.feed.routes.empty:
            routes_df = self.feed.routes.copy()
            # Ensure route_color and route_text_color columns exist and handle missing values
            if 'route_color' in routes_df.columns:
                # Fill potential missing route_color with a default or indication
                routes_df['route_color'] = routes_df['route_color'].fillna('No Color Specified')
                
                # Ensure route_text_color exists; if not, add with a default
                if 'route_text_color' not in routes_df.columns:
                    routes_df['route_text_color'] = '000000' # Default to black text if column is missing
                else:
                     # Fill potential missing route_text_color for existing column
                     routes_df['route_text_color'] = routes_df['route_text_color'].fillna('000000') # Default missing text color to black

                # Group by route_color and get counts and a sample route_text_color
                # We take the first non-null route_text_color for each color group
                grouped_colors = routes_df.groupby('route_color').agg(
                    count=('route_id', 'count'),
                    sample_text_color=('route_text_color', lambda x: x.dropna().iloc[0] if not x.dropna().empty else '000000') # Get first non-null or default
                ).reset_index()
                
                # Prepare data for the frontend
                color_summary = grouped_colors.to_dict('records')
                
        self.metrics["Route Colors"] = color_summary

    def _get_feed_info(self) -> Dict[str, Any]:
        """Extract feed information."""
        feed_info = {
            "feed_publisher_name": "Unknown",
            "feed_lang": "Unknown",
            "feed_version": "Unknown",
            "feed_start_date": None,
            "feed_end_date": None,
            "feed_contact_email": "Unknown",
            "feed_contact_url": "Unknown",
        }
        
        if hasattr(self.feed, 'feed_info') and self.feed.feed_info is not None and isinstance(self.feed.feed_info, pd.DataFrame) and not self.feed.feed_info.empty:
            try:
                # Access the first row, as feed_info.txt should have only one
                info_row = self.feed.feed_info.iloc[0]

                feed_info.update({
                    "feed_publisher_name": info_row['feed_publisher_name'] if 'feed_publisher_name' in self.feed.feed_info.columns and pd.notna(info_row.get('feed_publisher_name')) else "Unknown",
                    "feed_lang": info_row['feed_lang'] if 'feed_lang' in self.feed.feed_info.columns and pd.notna(info_row.get('feed_lang')) else "Unknown",
                    "feed_version": info_row['feed_version'] if 'feed_version' in self.feed.feed_info.columns and pd.notna(info_row.get('feed_version')) else "Unknown",
                    "feed_start_date": info_row['feed_start_date'] if 'feed_start_date' in self.feed.feed_info.columns and pd.notna(info_row.get('feed_start_date')) else None,
                    "feed_end_date": info_row['feed_end_date'] if 'feed_end_date' in self.feed.feed_info.columns and pd.notna(info_row.get('feed_end_date')) else None,
                    "feed_contact_email": info_row['feed_contact_email'] if 'feed_contact_email' in self.feed.feed_info.columns and pd.notna(info_row.get('feed_contact_email')) else "Unknown",
                    "feed_contact_url": info_row['feed_contact_url'] if 'feed_contact_url' in self.feed.feed_info.columns and pd.notna(info_row.get('feed_contact_url')) else "Unknown",
                })
            except Exception as e:
                print(f"Error extracting feed_info: {e}") # Log potential errors during extraction
                pass  # If any error occurs, keep the default values
                
        return feed_info
    
    def _calculate_service_coverage(self) -> Dict[str, Any]:
        """Calculate service coverage metrics."""
        service_days_counts = {
            "monday": 0,
            "tuesday": 0,
            "wednesday": 0,
            "thursday": 0,
            "friday": 0,
            "saturday": 0,
            "sunday": 0
        }

        if hasattr(self.feed, 'calendar') and self.feed.calendar is not None and not self.feed.calendar.empty:
            calendar = self.feed.calendar
            # Ensure columns exist before summing
            service_days_counts = {
                "monday": calendar.monday.sum() if 'monday' in calendar.columns else 0,
                "tuesday": calendar.tuesday.sum() if 'tuesday' in calendar.columns else 0,
                "wednesday": calendar.wednesday.sum() if 'wednesday' in calendar.columns else 0,
                "thursday": calendar.thursday.sum() if 'thursday' in calendar.columns else 0,
                "friday": calendar.friday.sum() if 'friday' in calendar.columns else 0,
                "saturday": calendar.saturday.sum() if 'saturday' in calendar.columns else 0,
                "sunday": calendar.sunday.sum() if 'sunday' in calendar.columns else 0
            }
        elif hasattr(self.feed, 'calendar_dates') and self.feed.calendar_dates is not None and not self.feed.calendar_dates.empty:
            calendar_dates = self.feed.calendar_dates
            # Count service IDs active on each weekday based on calendar_dates exception_type == 1
            # This is a simplified approach and might not capture all nuances of calendar_dates
            # We will keep this for the detailed daily counts view
            for index, row in calendar_dates.iterrows():
                 # Ensure 'date' and 'exception_type' columns exist
                if 'date' in row and 'exception_type' in row:
                    try:
                        date_obj = datetime.strptime(str(row['date']), '%Y%m%d').date()
                        weekday = date_obj.strftime('%A').lower()
                        if row['exception_type'] == 1: # Service added
                            if weekday in service_days_counts:
                                service_days_counts[weekday] += 1
                    except ValueError:
                        # Handle potential errors in date format
                        print(f"Skipping invalid date format in calendar_dates: {row['date']}")

        # Calculate the total number of distinct service dates using gtfs_kit's get_dates()
        try:
            all_service_dates = self.feed.get_dates()
            total_distinct_service_days = len(all_service_dates)
        except Exception as e:
            print(f"Error getting all service dates from feed: {e}")
            total_distinct_service_days = 0 # Default to 0 if calculation fails

        return {
            "daily_service_counts": service_days_counts, # Keep detailed daily counts
            "total_distinct_service_days": total_distinct_service_days, # New metric for summary
            "service_hours": self._calculate_service_hours()
        }
    
    def _calculate_service_hours(self) -> Dict[str, Any]:
        """Calculate service hours metrics."""
        if not hasattr(self.feed, 'stop_times') or self.feed.stop_times is None or self.feed.stop_times.empty:
            return {
                "earliest_service": "00:00:00",
                "latest_service": "00:00:00",
                "service_hours": 0
            }
            
        # Use gtfs_kit's built-in function to get earliest and latest times
        try:
            earliest_str, latest_str = gk.stop_times.get_start_and_end_times(self.feed)

            # Convert times to seconds past midnight using gtfs_kit helper
            earliest_seconds = gk.helpers.timestr_to_seconds(earliest_str)
            latest_seconds = gk.helpers.timestr_to_seconds(latest_str)
            
            # Calculate total service hours, handling cases where latest is on the next day
            if latest_seconds < earliest_seconds:
                # If latest time is earlier than earliest time, it spans across midnight
                total_seconds = (24 * 3600 - earliest_seconds) + latest_seconds
            else:
                total_seconds = latest_seconds - earliest_seconds

            service_hours = total_seconds / 3600.0

            return {
                "earliest_service": earliest_str,
                "latest_service": latest_str,
                "service_hours": service_hours
            }
        except Exception as e:
            print(f"Error calculating service hours: {e}")
            return {
                "earliest_service": "00:00:00",
                "latest_service": "00:00:00",
                "service_hours": 0
            }
    
    def _calculate_stop_coverage(self) -> Dict[str, Any]:
        """Calculate stop coverage metrics."""
        if not hasattr(self.feed, 'stops'):
            return {"error": "No stops data available"}
            
        stops = self.feed.stops
        return {
            "total_stops": len(stops),
            "stops_with_coordinates": len(stops[~stops.stop_lat.isna() & ~stops.stop_lon.isna()]),
            "stops_with_names": len(stops[~stops.stop_name.isna()]),
            "stops_with_wheelchair_info": len(stops[~stops.wheelchair_boarding.isna()]) if 'wheelchair_boarding' in stops.columns else 0
        }
    
    def _calculate_route_coverage(self) -> Dict[str, Any]:
        """Calculate route coverage metrics."""
        if not hasattr(self.feed, 'routes'):
            return {"error": "No routes data available"}
            
        routes = self.feed.routes
        return {
            "total_routes": len(routes),
            "routes_with_names": len(routes[~routes.route_long_name.isna()]),
            "routes_with_types": len(routes[~routes.route_type.isna()]),
            "routes_with_colors": len(routes[~routes.route_color.isna()]) if 'route_color' in routes.columns else 0
        }
    
    def _calculate_data_quality(self) -> Dict[str, Any]:
        """Calculate data quality metrics."""
        quality_metrics = {
            "required_files_present": len(self.validation_results.get('errors', [])) == 0,
            "total_errors": len(self.validation_results.get('errors', [])),
            "total_warnings": len(self.validation_results.get('warnings', [])),
            "data_completeness": self._calculate_completeness()
        }
        return quality_metrics
    
    def _calculate_completeness(self) -> Dict[str, float]:
        """Calculate data completeness scores for each file."""
        completeness = {}
        # Include both calendar and calendar_dates in potential files
        service_files = ['calendar', 'calendar_dates']
        other_files = ['agency', 'stops', 'routes', 'trips', 'stop_times']
        
        files_to_check = other_files + service_files

        for file_attr in files_to_check:
            if hasattr(self.feed, file_attr):
                df = getattr(self.feed, file_attr)
                if df is not None and isinstance(df, pd.DataFrame) and not df.empty:
                    # Calculate percentage of non-null values
                    completeness[file_attr] = (df.count().sum() / (df.shape[0] * df.shape[1])) * 100
                else:
                    completeness[file_attr] = 0
            else:
                completeness[file_attr] = 0
                
        # Special handling for calendar completeness: use the higher score if both exist
        if 'calendar' in completeness and 'calendar_dates' in completeness:
            # If one has data and the other doesn't, prioritize the one with data
            if completeness['calendar'] == 0 and completeness['calendar_dates'] > 0:
                 completeness['calendar'] = completeness['calendar_dates']
                 del completeness['calendar_dates']
            elif completeness['calendar_dates'] == 0 and completeness['calendar'] > 0:
                 del completeness['calendar_dates']
            elif completeness['calendar'] > 0 and completeness['calendar_dates'] > 0:
                 # If both have data, perhaps take the max or sum? Let's take the max for simplicity for now.
                 completeness['calendar'] = max(completeness['calendar'], completeness['calendar_dates'])
                 del completeness['calendar_dates']
            elif completeness['calendar'] == 0 and completeness['calendar_dates'] == 0:
                 # If neither has data, keep calendar at 0
                 if 'calendar_dates' in completeness: del completeness['calendar_dates']

        return completeness
    
    def _generate_summary(self) -> Dict[str, Any]:
        """Generate a human-readable summary of the validation results."""
        service_days = self.metrics.get("Service Dates", {}).get("daily_service_counts", {})
        service_hours = self.metrics.get("Service Dates", {}).get("service_hours", {})

        return {
            "overall_status": "valid" if self.validation_results.get('is_valid', False) else "invalid",
            "feed_health_score": self._calculate_health_score(),
            "key_metrics": {
                "total_stops": self.metrics.get("Counts", {}).get("Stops", 0),
                "total_routes": self.metrics.get("Counts", {}).get("Routes", 0),
                "total_trips": self.metrics.get("Counts", {}).get("Trips", 0),
                "service_days": self.metrics.get("Service Dates", {}).get("total_distinct_service_days", 0),
                "service_hours": service_hours.get("service_hours", 0) if isinstance(service_hours, dict) else 0
            },
            "critical_issues": [error for error in self.validation_results.get('errors', [])
                              if "required" in error.get('message', '').lower()],
            "recommendations": self._generate_recommendations()
        }
    
    def _calculate_health_score(self) -> float:
        """Calculate an overall health score for the feed (0-100)."""
        if not self.validation_results.get('is_valid', False):
            return 0

        # Base score starts at 100
        score = 100

        # Deduct points for errors and warnings
        score -= len(self.validation_results.get('errors', [])) * 10
        score -= len(self.validation_results.get('warnings', [])) * 5

        # Deduct points for missing optional data (using the updated completeness)
        completeness = self._calculate_completeness()
        for file, comp_score in completeness.items(): # Renamed score to comp_score to avoid conflict
            if comp_score < 80:  # If completeness is less than 80%
                score -= (80 - comp_score) * 0.5

        return max(0, min(100, score))
    
    def _generate_recommendations(self) -> List[str]:
        """Generate recommendations based on validation results and metrics."""
        recommendations = []

        # Check for missing optional files
        optional_files = ['feed_info', 'shapes', 'frequencies', 'transfers', 'pathways', 'levels', 'fare_attributes'] # Added new optional files
        for file in optional_files:
            # Check if the dataframe exists and is not empty
            if not hasattr(self.feed, file) or getattr(self.feed, file) is None or (isinstance(getattr(self.feed, file), pd.DataFrame) and getattr(self.feed, file).empty):
                 # Check completeness if calculated, otherwise just report as missing/empty
                 completeness_score = self.metrics.get("data_quality", {}).get("data_completeness", {}).get(file, 0) # This still uses the old structure, will need adjustment later
                 if completeness_score == 0:
                     recommendations.append(f"Consider adding {file}.txt or improving its completeness")

        # Check data completeness for files with low scores (using updated completeness)
        completeness = self._calculate_completeness()
        for file, comp_score in completeness.items(): # Renamed score to comp_score
            if file not in optional_files and comp_score < 80 and comp_score > 0: # Only recommend for required files with some data but low completeness
                recommendations.append(f"Improve data completeness in {file}.txt (currently {comp_score:.1f}%)")

        # Removed the service days recommendation
        # Check service coverage
        # service_days = self.metrics["service_coverage"]["service_days"]
        # if sum(service_days.values()) < 7:
        #     recommendations.append("Consider adding service for all days of the week")

        return recommendations
    
    def export_json(self, report: Dict[str, Any]) -> str:
        """Export the report as JSON."""
        return json.dumps(report, indent=2)
    
    def export_csv(self, report: Dict[str, Any]) -> str:
        """Export the report as CSV."""
        output = StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow(['Category', 'Metric', 'Value'])
        
        # Write feed info
        for key, value in report['feed_info'].items():
            writer.writerow(['Feed Info', key, value])
            
        # Write metrics
        for category, metrics in report['metrics'].items():
            if isinstance(metrics, dict):
                for key, value in metrics.items():
                    if isinstance(value, dict):
                        for subkey, subvalue in value.items():
                            writer.writerow([f'{category} - {key}', subkey, subvalue])
                    else:
                        writer.writerow([category, key, value])
                        
        # Write validation results
        writer.writerow(['Validation', 'Overall Status', report['summary']['overall_status']])
        writer.writerow(['Validation', 'Health Score', report['summary']['feed_health_score']])
        
        # Write errors and warnings
        for error in report['validation_results'].get('errors', []):
            writer.writerow(['Error', error.get('message', ''), ''])
        for warning in report['validation_results'].get('warnings', []):
            writer.writerow(['Warning', warning.get('message', ''), ''])
            
        # Write recommendations
        for rec in report['summary']['recommendations']:
            writer.writerow(['Recommendation', rec, ''])
            
        return output.getvalue() 
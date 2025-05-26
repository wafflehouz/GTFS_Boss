/**
 * Type definitions for the GTFS Boss application.
 * These types represent the data structures used throughout the application,
 * including GTFS validation results, real-time vehicle data, and map features.
 */

/**
 * Vehicle position data from GTFS-realtime feed.
 * Represents the current location and movement of a transit vehicle.
 */
export interface VehiclePosition {
    latitude: number;    // Vehicle's current latitude
    longitude: number;   // Vehicle's current longitude
    bearing?: number;    // Vehicle's heading in degrees (0-360)
    speed?: number;      // Vehicle's current speed in km/h
}

/**
 * Trip information associated with a vehicle.
 * Links the vehicle to its current route and direction.
 */
export interface VehicleTripInfo {
    tripId?: string;     // Unique identifier for the trip
    routeId?: string;    // Route identifier the vehicle is currently serving
    directionId?: number; // Direction of travel (0 = outbound, 1 = inbound)
}

/**
 * Complete vehicle information from GTFS-realtime feed.
 * Combines position, trip, and status information for a transit vehicle.
 */
export interface Vehicle {
    id: string;          // Unique vehicle identifier
    label?: string;      // Human-readable vehicle label/name
    position?: VehiclePosition;  // Current position and movement data
    currentStatus?: string;      // Current operational status
    stopId?: string;     // ID of the current or next stop
    congestionLevel?: string;    // Current congestion level
    occupancyStatus?: string;    // Current passenger load
    scheduleDeviation?: number;  // Schedule deviation in seconds
    trip?: VehicleTripInfo;      // Associated trip information
}

/**
 * Service alert information from GTFS-realtime feed.
 * Represents disruptions, detours, or other service changes.
 */
export interface Alert {
    id?: string;         // Unique alert identifier
    cause?: string;      // Reason for the alert
    effect?: string;     // Impact on service
    url?: string;        // URL for more information
    headerText?: string; // Short alert title
    descriptionText?: string; // Detailed alert description
    informedEntities?: Array<{  // Affected transit elements
        routeId?: string;      // Affected route
        stopId?: string;       // Affected stop
        trip?: { tripId?: string }  // Affected trip
    }>;
}

/**
 * Complete real-time data package.
 * Contains all real-time information including vehicles, metrics, and alerts.
 */
export interface RealtimeData {
    vehicles: Vehicle[];         // List of active vehicles
    realtimeMetrics: RealtimeMetrics;  // Performance metrics
    alerts: Alert[];             // Active service alerts
}

/**
 * Real-time performance metrics.
 * Tracks schedule adherence and service quality metrics.
 */
export interface RealtimeMetrics {
    total_vehicles_reporting_deviation: number;  // Total vehicles with schedule data
    on_time_vehicles: number;    // Vehicles within 1 minute of schedule
    on_time_percentage: number;  // Percentage of vehicles on time
    early_vehicles_count: number;  // Vehicles ahead of schedule
    late_vehicles_count: number;   // Vehicles behind schedule
    average_early_deviation_seconds: number;  // Average early time in seconds
    average_late_deviation_seconds: number;   // Average late time in seconds
    average_overall_deviation_seconds: number; // Average deviation across all vehicles
}

/**
 * GTFS feed information.
 * Contains metadata about the transit feed.
 */
export interface FeedInfo {
    feed_publisher_name?: string;    // Agency or organization name
    feed_lang?: string;              // Primary language of the feed
    feed_version?: string;           // Version of the feed
    feed_start_date?: string;        // Start date of feed validity
    feed_end_date?: string;          // End date of feed validity
    feed_contact_email?: string;     // Contact email for feed issues
    feed_contact_url?: string;       // Contact website for feed issues
}

/**
 * Counts of GTFS entities.
 * Tracks the number of various transit elements in the feed.
 */
export interface Counts {
    Agencies: number;           // Number of transit agencies
    Routes: number;             // Number of transit routes
    Trips: number;              // Number of scheduled trips
    Stops: number;              // Number of transit stops
    Stations: number;           // Number of transit stations
    Entrances: number;          // Number of station entrances
    "Generic nodes": number;    // Number of generic nodes
    "Boarding areas": number;   // Number of boarding areas
    Pathways: number;           // Number of pathways
    Levels: number;             // Number of levels
    Shapes: number;             // Number of route shapes
    Transfers: number;          // Number of transfer points
    "Service Periods": number;  // Number of service periods
    "Fare Attributes": number;  // Number of fare types
}

/**
 * Service day counts.
 * Tracks service frequency by day of week.
 */
export interface ServiceDays {
    monday: number;     // Number of trips on Monday
    tuesday: number;    // Number of trips on Tuesday
    wednesday: number;  // Number of trips on Wednesday
    thursday: number;   // Number of trips on Thursday
    friday: number;     // Number of trips on Friday
    saturday: number;   // Number of trips on Saturday
    sunday: number;     // Number of trips on Sunday
}

/**
 * Service hours information.
 * Tracks the span of service hours.
 */
export interface ServiceHours {
    earliest_service: string;  // Time of first service
    latest_service: string;    // Time of last service
    service_hours: number;     // Total hours of service
}

/**
 * Service dates and hours information.
 * Combines service day and hour information.
 */
export interface ServiceDates {
    service_days?: ServiceDays;           // Service by day of week
    service_hours?: ServiceHours;         // Service hour information
    daily_service_counts?: ServiceDays;   // Daily service frequency
    total_distinct_service_days?: number; // Total days with service
}

/**
 * Route color information.
 * Tracks the color scheme of routes.
 */
export interface RouteColorSummary {
    route_color: string;        // Background color for route
    count: number;              // Number of routes with this color
    sample_text_color: string;  // Text color for contrast
}

/**
 * GTFS feed metrics.
 * Contains various counts and summaries of the feed.
 */
export interface Metrics {
    Counts?: Counts;                    // Entity counts
    "Service Dates"?: ServiceDates;     // Service information
    "Route Colors"?: RouteColorSummary[]; // Route color information
}

/**
 * GTFS feed summary.
 * Contains overall feed health and recommendations.
 */
export interface Summary {
    overall_status: string;     // Overall feed status
    feed_health_score: number;  // Feed health score (0-100)
    key_metrics?: {            // Key performance indicators
        total_stops: number;   // Total number of stops
        total_routes: number;  // Total number of routes
        total_trips: number;   // Total number of trips
        service_days: number;  // Number of service days
        service_hours: number; // Total service hours
    };
    critical_issues: Array<{ message: string }>;  // Critical problems
    recommendations: string[];  // Improvement suggestions
}

/**
 * Complete validation results.
 * Contains all information about GTFS feed validation.
 */
export interface ValidationResults {
    is_valid: boolean;         // Whether the feed is valid
    errors: Array<{ message: string }>;    // Validation errors
    warnings: Array<{ message: string }>;  // Validation warnings
    feed_info?: FeedInfo;      // Feed metadata
    metrics?: Metrics;         // Feed metrics
    summary?: Summary;         // Feed summary
}

/**
 * GeoJSON Point geometry.
 * Represents a single point on the map.
 */
export interface GeoJSONPoint {
    type: "Point";
    coordinates: [number, number];  // [longitude, latitude]
}

/**
 * GeoJSON LineString geometry.
 * Represents a line on the map.
 */
export interface GeoJSONLineString {
    type: "LineString";
    coordinates: Array<[number, number]>;  // Array of [longitude, latitude] pairs
}

/**
 * GeoJSON MultiLineString geometry.
 * Represents multiple connected lines on the map.
 */
export interface GeoJSONMultiLineString {
    type: "MultiLineString";
    coordinates: Array<Array<[number, number]>>;  // Array of line coordinates
}

/**
 * Union type of all GeoJSON geometry types.
 */
export type GeoJSONGeometry = GeoJSONPoint | GeoJSONLineString | GeoJSONMultiLineString;

/**
 * Route feature properties.
 * Contains styling and identification information for routes.
 */
export interface RouteFeatureProperties {
    route_color?: string;          // Route color
    route_short_name?: string;     // Route identifier
}

/**
 * Route feature.
 * Represents a route on the map with its geometry and properties.
 */
export interface RouteFeature {
    type: "Feature";
    properties: RouteFeatureProperties;  // Route properties
    geometry: GeoJSONGeometry;          // Route geometry
}

/**
 * Feature collection of routes.
 * Contains all route features for the map.
 */
export interface CustomFeatureCollection {
    type: "FeatureCollection";
    features: RouteFeature[];  // Array of route features
} 
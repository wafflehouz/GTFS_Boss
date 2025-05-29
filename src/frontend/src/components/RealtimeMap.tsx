/**
 * RealtimeMap Component
 * 
 * A React component that displays a map with GTFS real-time data visualization.
 * Features include:
 * - Display of transit routes from GTFS static data
 * - Real-time vehicle positions and status
 * - Transit stops and stations
 * - Service alerts
 * - Performance metrics
 * 
 * The component uses MapTiler GL JS for map rendering and updates vehicle positions
 * every 15 seconds to show real-time transit information.
 */

import { useEffect, useRef, useState } from 'react';
import { Map, NavigationControl, Popup, Marker, MapStyle } from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';
import type { RealtimeData, CustomFeatureCollection, ValidationResults } from '../types';

// Use import.meta.env for Vite compatibility
const MAPTILER_TOKEN = import.meta.env.VITE_MAPTILER_ACCESS_TOKEN;

/**
 * Props for the RealtimeMap component
 */
interface RealtimeMapProps {
    className?: string;                    // CSS class name for the map container
    validationResults?: ValidationResults; // GTFS validation results from static feed
    showRoutes?: boolean;                  // Whether to show static route lines on the map
    showStops?: boolean;                   // Whether to show static transit stops on the map
    showVehicles?: boolean;                // Whether to show real-time vehicle positions on the map
    // Callback function to pass fetched real-time data to the parent component
    onRealtimeDataFetched?: (data: RealtimeData | null) => void; 
}

/**
 * RealtimeMap Component
 * 
 * @param props - Component props
 * @returns React component
 */
const RealtimeMap: React.FC<RealtimeMapProps> = ({
    className = '',
    validationResults,
    showRoutes = true,
    showStops = true,
    showVehicles = true,
    onRealtimeDataFetched
}) => {
    // Reference to the map container DOM element
    const mapContainer = useRef<HTMLDivElement>(null);
    // Reference to the MapTiler GL JS map instance
    const map = useRef<Map | null>(null);
    // Reference to store MapTiler GL JS vehicle markers
    const vehicleMarkers = useRef<{ [key: string]: Marker }>({});
    // State to store fetched static route GeoJSON features
    const [routeFeatures, setRouteFeatures] = useState<CustomFeatureCollection | null>(null);
    // State to store fetched static stop GeoJSON geometry
    const [stopGeometry, setStopGeometry] = useState<CustomFeatureCollection | null>(null);
    // State to store fetched real-time data (vehicles, metrics, alerts)
    const [realtimeData, setRealtimeData] = useState<RealtimeData | null>(null);
    // State to store errors during route geometry fetch
    const [routeError, setRouteError] = useState<string | null>(null);
    // State to store errors during stop geometry fetch
    const [stopError, setStopError] = useState<string | null>(null);
    // State to store errors during real-time data fetch
    const [realtimeError, setRealtimeError] = useState<string | null>(null);
    // State to store map initialization error
    const [mapError, setMapError] = useState<string | null>(null);
    // State to store map load status
    const [isMapLoaded, setIsMapLoaded] = useState<boolean>(false);

    // Default map center coordinates (Phoenix, AZ)
    const [center] = useState<[number, number]>([-112.074037, 33.448376]);

    /**
     * Effect hook to initialize the MapTiler GL JS map.
     * Runs once on component mount.
     */
    useEffect(() => {
        // Prevent map re-initialization if it already exists
        if (map.current) return;

        // Check if we have a valid token
        if (!MAPTILER_TOKEN) {
            setMapError('MapTiler access token is missing');
            return;
        }

        try {
            // Add a small timeout before initializing the map
            const timeoutId = setTimeout(() => {
                // Create a new MapTiler GL JS map instance
                const mapInstance = new Map({
                    container: mapContainer.current!,
                    style: MapStyle.STREETS.DARK,
                    apiKey: MAPTILER_TOKEN,
                    center: center,
                    zoom: 12,
                    bearing: 0,
                    pitch: 0
                });

                // Add navigation control (zoom and rotation buttons) to the map
                mapInstance.addControl(new NavigationControl());

                // Store the map instance in the ref
                map.current = mapInstance;

                // Add event listener for missing style images
                mapInstance.on('styleimagemissing', (e) => {
                    // Workaround: Add a transparent 1x1 image if a style image is missing
                    if (mapInstance && !mapInstance.hasImage(e.id)) {
                         const transparentPixel = new Uint8Array([0, 0, 0, 0]);
                         mapInstance.addImage(e.id, { width: 1, height: 1, data: transparentPixel });
                    }
                });

                // Add event listener for the map's load event
                mapInstance.on('load', () => {
                    setMapError(null);
                    setIsMapLoaded(true);
                });

                // Add error handler
                mapInstance.on('error', (e: Error) => {
                    if (e.message && e.message.includes('401')) {
                        setMapError('Invalid MapTiler access token. Please check your token in the .env file.');
                    } else {
                        setMapError('Error loading map: ' + e.message);
                    }
                });

            }, 100);

            // Cleanup function to clear the timeout
            return () => clearTimeout(timeoutId);

        } catch (error) {
            setMapError('Failed to initialize map: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }

        // Cleanup function to remove the map instance when the component unmounts
        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, [center]);

    /**
     * Effect hook to fetch real-time vehicle data periodically.
     * Sets up an interval to fetch data every 15 seconds.
     */
    useEffect(() => {
        // Function to fetch real-time vehicle data from the backend
        const fetchVehicles = async () => {
            try {
                const response = await fetch('http://localhost:8000/api/v1/realtime/vehicles');
                if (!response.ok) {
                    throw new Error(`Failed to fetch vehicle data: ${response.statusText}`);
                }                // Parse the JSON response
                const data: RealtimeData = await response.json();

                // Update state with fetched data
                setRealtimeData(data);

                // Notify parent component about fetched data
                if (onRealtimeDataFetched) {
                    onRealtimeDataFetched(data);
                }                    // Clear any previous real-time errors
                setRealtimeError(null);

            } catch (err) {
                 // Handle fetch errors
                const errorMessage = err instanceof Error ? err.message : 'An error occurred while fetching vehicles';
                // Set error state
                setRealtimeError(errorMessage);
                // Clear real-time data on error
                setRealtimeData(null);
                 // Notify parent component about the error
                 if (onRealtimeDataFetched) {
                     onRealtimeDataFetched(null);
                 }
            }
        };

        // Fetch vehicles data immediately on component mount
        fetchVehicles();

        // Set up an interval to fetch vehicles data every 15 seconds (15000 milliseconds)
        const interval = setInterval(fetchVehicles, 15000);

        // Cleanup function to clear the interval when the component unmounts or dependencies change
        return () => clearInterval(interval);
    }, [onRealtimeDataFetched]); // Re-run effect if the onRealtimeDataFetched callback changes

    /**
     * Effect hook to fetch static route geometry when validation results change.
     * Updates the routeFeatures state.
     */
    useEffect(() => {
        // Fetch route geometry if validation results are available
        if (validationResults) {
            const fetchRouteGeometry = async () => {
                try {
                    const response = await fetch('http://localhost:8000/api/v1/routes/geometry');
                    if (!response.ok) {
                        // Handle 404 specifically if no validated feed exists
                        if (response.status === 404) {
                            setRouteError('No GTFS feed has been validated yet. Upload a feed to see static routes.');
                        } else {
                            throw new Error(`Failed to fetch route geometry: ${response.statusText}`);
                        }
                        // Clear route features on error
                        setRouteFeatures(null);
                        return;
                    }
                    // Parse the GeoJSON response
                    const data: CustomFeatureCollection = await response.json();
                    // Set route features state
                    setRouteFeatures(data);
                    // Clear any previous route errors
                    setRouteError(null);

                } catch (err) {
                     // Handle fetch errors
                    setRouteError(err instanceof Error ? err.message : 'An error occurred while fetching route geometry');
                    // Clear route features on error
                    setRouteFeatures(null);
                }
            };
            // Fetch route geometry
            fetchRouteGeometry();
        } else {
            // Clear route features if no validation results
             setRouteFeatures(null);
        }
    }, [validationResults]); // Re-run effect when validation results are updated

    /**
     * Effect hook to fetch static stop geometry when validation results change.
     * Updates the stopGeometry state.
     */
    useEffect(() => {
         // Fetch stop geometry if validation results are available
         if (validationResults) {
             const fetchStopGeometry = async () => {
                 try {
                     const response = await fetch('http://localhost:8000/api/v1/stops/geometry');
                     if (!response.ok) {
                         // Handle 404 specifically if no validated feed exists
                         if (response.status === 404) {
                             setStopError('Stops data not available in the validated feed.');
                         } else {
                             throw new Error(`Failed to fetch stop geometry: ${response.statusText}`);
                         }                          // Clear stop geometry on error
                         setStopGeometry(null);
                         return;
                     }
                     // Parse the GeoJSON response
                     const data: CustomFeatureCollection = await response.json();
                     // Set stop geometry state
                     setStopGeometry(data);
                     // Clear any previous stop errors
                     setStopError(null);

                 } catch (err) {
                      // Handle fetch errors
                     setStopError(err instanceof Error ? err.message : 'An error occurred while fetching stop geometry');
                     // Clear stop geometry on error
                     setStopGeometry(null);
                 }
             };
             // Fetch stop geometry
             fetchStopGeometry();
         } else {
             // Clear stop geometry if stops are not shown or no validation results
              setStopGeometry(null);
         }
    }, [validationResults]); // Re-run effect when validation results are updated

    /**
     * Effect hook to manage static route and stop GeoJSON layers on the map.
     * Adds, updates, or removes layers based on map readiness, data, and visibility.
     */
    useEffect(() => {
        const mapInstance = map.current;
        const routeSourceId = 'routes';
        const routeLayerId = 'routes-layer';
        const stopSourceId = 'stops';
        const stopLayerId = 'stops-layer';

        // Define event handlers for the routes layer
        const routeClickHandler = (e: any) => {
            if (mapInstance && e.features && e.features[0]) {
                const feature = e.features[0];
                const routeShortName = feature.properties?.route_short_name || 'N/A';
                const routeId = feature.properties?.route_id || 'N/A';
                const routeColor = feature.properties?.route_color || '#000000';
                const routeLongName = feature.properties?.route_long_name || 'N/A';
                
                // Create a color preview div
                const colorPreview = document.createElement('div');
                colorPreview.style.cssText = `
                    width: 20px;
                    height: 20px;
                    background-color: ${routeColor};
                    border: 1px solid #ccc;
                    margin-right: 10px;
                    display: inline-block;
                    vertical-align: middle;
                `;

                new Popup()
                    .setLngLat(e.lngLat)
                    .setHTML(`
                        <div style="padding: 5px;">
                            <div style="display: flex; align-items: center; margin-bottom: 10px;">
                                ${colorPreview.outerHTML}
                                <h3 style="margin: 0;">Route ${routeShortName}</h3>
                            </div>
                            <p style="margin: 0 0 5px 0;"><strong>Route ID:</strong> ${routeId}</p>
                            <p style="margin: 0;"><strong>Description:</strong> ${routeLongName}</p>
                        </div>
                    `)
                    .addTo(mapInstance);
            }
        };

        const routeMouseEnterHandler = () => { if(mapInstance) mapInstance.getCanvas().style.cursor = 'pointer'; };
        const routeMouseLeaveHandler = () => { if(mapInstance) mapInstance.getCanvas().style.cursor = ''; };

        // Function to remove the routes layer and source, and associated event listeners
        const removeRoutesLayer = () => {
            if (mapInstance && mapInstance.isStyleLoaded()) {
                // Remove event listeners before removing the layer, checking if the layer exists first
                if (mapInstance.getLayer(routeLayerId)) {
                    mapInstance.off('click', routeLayerId, routeClickHandler);
                    mapInstance.off('mouseenter', routeLayerId, routeMouseEnterHandler);
                    mapInstance.off('mouseleave', routeLayerId, routeMouseLeaveHandler);
                }

                // Check if layer exists before removing
                if (mapInstance.getLayer(routeLayerId)) {
                    mapInstance.removeLayer(routeLayerId);
                }
                // Check if source exists before removing
                if (mapInstance.getSource(routeSourceId)) {
                    mapInstance.removeSource(routeSourceId);
                }
            }
        };

        // Define event handlers for the stops layer
        const stopClickHandler = (e: any) => {
            if (mapInstance && e.features && e.features[0]) {
                const feature = e.features[0];
                const stopName = feature.properties?.stop_name || 'N/A';
                const stopId = feature.properties?.stop_id || 'N/A';
                const stopDesc = feature.properties?.stop_desc || 'N/A';
                new Popup()
                    .setLngLat(e.lngLat)
                    .setHTML(`
                        <div style="padding: 5px;">
                            <h3 style="margin: 0 0 5px 0;">${stopName}</h3>
                            <p style="margin: 0;">ID: ${stopId}</p>
                            ${stopDesc !== 'N/A' ? `<p style="margin: 5px 0 0 0;">${stopDesc}</p>` : ''}
                        </div>
                    `)
                    .addTo(mapInstance);
            }
        };

        const stopMouseEnterHandler = () => { 
            if(mapInstance) {
                mapInstance.getCanvas().style.cursor = 'pointer';
            }
        };
        const stopMouseLeaveHandler = () => { 
            if(mapInstance) {
                mapInstance.getCanvas().style.cursor = '';
            }
        };

        // Function to remove the stops layer and source, and associated event listeners
        const removeStopsLayer = () => {
            if (mapInstance && mapInstance.isStyleLoaded()) {
                // Remove event listeners before removing the layer, checking if the layer exists first
                if (mapInstance.getLayer(stopLayerId)) {
                    mapInstance.off('click', stopLayerId, stopClickHandler);
                    mapInstance.off('mouseenter', stopLayerId, stopMouseEnterHandler);
                    mapInstance.off('mouseleave', stopLayerId, stopMouseLeaveHandler);
                }

                // Check if layer exists before removing
                if (mapInstance.getLayer(stopLayerId)) {
                    mapInstance.removeLayer(stopLayerId);
                }
                // Check if source exists before removing
                if (mapInstance.getSource(stopSourceId)) {
                    mapInstance.removeSource(stopSourceId);
                }
            }
        };

        // --- Logic to add/update/remove layers based on map readiness, data, and visibility ---
        // Only proceed if map instance exists and the map is reported as loaded
        if (mapInstance && isMapLoaded) {
            // Manage Route Layer
            if (showRoutes && routeFeatures) {
                // Add or update route source
                if (!mapInstance.getSource(routeSourceId)) {
                    mapInstance.addSource(routeSourceId, {
                        type: 'geojson',
                        data: routeFeatures as any
                    });
                } else {
                     // Update source data
                    (mapInstance.getSource(routeSourceId) as any).setData(routeFeatures as any);
                }

                // Add route layer and event listeners if not already added
                if (!mapInstance.getLayer(routeLayerId)) {
                     mapInstance.addLayer({
                         id: routeLayerId,
                         type: 'line',
                         source: routeSourceId,
                         layout: {},
                         paint: {
                             'line-color': [
                                 'case',
                                 ['has', 'route_color'],
                                 ['get', 'route_color'],
                                 '#000000'
                             ],
                             'line-width': 2
                         }
                     });

                     mapInstance.on('click', routeLayerId, routeClickHandler);
                     mapInstance.on('mouseenter', routeLayerId, routeMouseEnterHandler);
                     mapInstance.on('mouseleave', routeLayerId, routeMouseLeaveHandler);
                 }

            } else {
                // If not showing routes, remove the layer
                removeRoutesLayer();
            }

            // Manage Stop Layer
            if (showStops && stopGeometry) {
                // Add or update stop source
                 if (!mapInstance.getSource(stopSourceId)) {
                     mapInstance.addSource(stopSourceId, {
                         type: 'geojson',
                         data: stopGeometry as any
                     });
                 } else {
                     // Update source data
                     (mapInstance.getSource(stopSourceId) as any).setData(stopGeometry as any);
                 }

                 // Add stop layer and event listeners if not already added
                 if (!mapInstance.getLayer(stopLayerId)) {
                     // Add the stop point layer
                     mapInstance.addLayer({
                         id: stopLayerId,
                         type: 'circle',
                         source: stopSourceId,
                         paint: {
                             'circle-radius': 3,
                             'circle-color': '#ffffff',
                             'circle-stroke-color': '#000',
                             'circle-stroke-width': 0.5,
                             'circle-opacity': 0.8
                         }
                     });

                     mapInstance.on('click', stopLayerId, stopClickHandler);
                     mapInstance.on('mouseenter', stopLayerId, stopMouseEnterHandler);
                     mapInstance.on('mouseleave', stopLayerId, stopMouseLeaveHandler);
                 }

            } else {
                 // If not showing stops, remove the layer
                 removeStopsLayer();
            }
        } else {
            // If map is not loaded, remove layers to ensure a clean state if props change before load
            removeRoutesLayer();
            removeStopsLayer();
        }
        // --- End Logic ---

        // Cleanup function to remove layers and sources when dependencies change or component unmounts
        return () => {
            removeRoutesLayer();
            removeStopsLayer();
        };

    }, [map.current, routeFeatures, stopGeometry, showRoutes, showStops, isMapLoaded]); // Dependencies for managing layers

    /**
     * Effect hook to manage vehicle markers on the map.
     * Adds, updates, or removes markers based on real-time vehicle data and visibility state.
     * Depends on map and style being loaded.
     */
    useEffect(() => {
        // Ensure map is initialized, style is loaded, showVehicles is true, and real-time data with vehicles is available
        if (!map.current || !isMapLoaded || !showVehicles || !realtimeData || !realtimeData.vehicles) { // Depend on isMapLoaded
            // Remove all existing vehicle markers if map instance exists
            if (map.current) {
                Object.values(vehicleMarkers.current).forEach(marker => marker.remove());
            }
            // Clear the vehicle markers reference object
            vehicleMarkers.current = {};
            return; // Exit if conditions for drawing are not met
        }

        const mapInstance = map.current;
        // Filter vehicles to include only those with position data
        const vehiclesWithPositions = realtimeData.vehicles.filter(v => v.position);
        const currentMarkers = vehicleMarkers.current;
        const nextMarkers: { [key: string]: Marker } = {};

        // Iterate over vehicles with positions to update or create markers
        vehiclesWithPositions.forEach(vehicle => {
            const vehicleId = vehicle.id;
            const position = vehicle.position!; // Non-null assertion is safe due to filter

            if (currentMarkers[vehicleId]) {
                // If marker already exists, update its position and rotation
                currentMarkers[vehicleId]
                    .setLngLat([position.longitude, position.latitude])
                    .setRotation(position.bearing || 0); // Update rotation, default to 0 if bearing is null/undefined

                // Create popup content string
                 const popupContent = `
                     <div>
                         <h3>Vehicle ${vehicle.label || 'N/A'}</h3>
                         <p>Status: ${vehicle.currentStatus || 'N/A'}</p>
                         <p>Route: ${vehicle.trip?.routeId || 'N/A'}</p>
                         <p>Direction: ${getDirectionName(vehicle.trip?.directionId)}</p>
                         <p>Schedule: ${formatScheduleDeviation(vehicle.scheduleDeviation)}</p>
                         ${vehicle.congestionLevel ? `<p>Congestion: ${getCongestionLevel(vehicle.congestionLevel)}</p>` : ''}
                         ${vehicle.occupancyStatus ? `<p>Occupancy: ${getOccupancyStatus(vehicle.occupancyStatus)}</p>` : ''}
                         <p>Trip ID: ${vehicle.trip?.tripId || 'N/A'}</p>
                         <p>Stop ID: ${vehicle.stopId || 'N/A'}</p>
                         ${position.bearing != null ? `<p>Bearing: ${Number(position.bearing).toFixed(2)}</p>` : ''}
                         ${position.speed != null ? `<p>Speed: ${Number(position.speed).toFixed(2)} km/h</p>` : ''}
                     </div>
                 `;

                 // Check if popup content has changed before updating to avoid unnecessary DOM manipulation
                 // Add null checks for getPopup() and getElement()
                 if (currentMarkers[vehicleId].getPopup()?.getElement()?.innerHTML !== popupContent) {
                     currentMarkers[vehicleId]?.setPopup(new Popup({ offset: 25 }).setHTML(popupContent));
                 }

                // Keep the existing marker and remove it from the currentMarkers list
                nextMarkers[vehicleId] = currentMarkers[vehicleId];
                delete currentMarkers[vehicleId];

            } else {
                // If marker does not exist, create a new one
                const marker = new Marker({
                    // Create a custom HTML element for the marker icon
                     element: createVehicleIconElement(position.bearing || 0, vehicle.scheduleDeviation).element,
                    anchor: 'center' // Set the anchor point of the icon
                 })
                    // Set the marker's geographic coordinates
                    .setLngLat([position.longitude, position.latitude]);

                // Create popup content string for the new marker
                const popupContent = `
                    <div>
                        <h3>Vehicle ${vehicle.label || 'N/A'}</h3>
                        <p>Status: ${vehicle.currentStatus || 'N/A'}</p>
                        <p>Route: ${vehicle.trip?.routeId || 'N/A'}</p>
                        <p>Direction: ${getDirectionName(vehicle.trip?.directionId)}</p>
                        <p>Schedule: ${formatScheduleDeviation(vehicle.scheduleDeviation)}</p>
                        ${vehicle.congestionLevel ? `<p>Congestion: ${getCongestionLevel(vehicle.congestionLevel)}</p>` : ''}
                        ${vehicle.occupancyStatus ? `<p>Occupancy: ${getOccupancyStatus(vehicle.occupancyStatus)}</p>` : ''}
                        <p>Trip ID: ${vehicle.trip?.tripId || 'N/A'}</p>
                        <p>Stop ID: ${vehicle.stopId || 'N/A'}</p>
                         ${position.bearing != null ? `<p>Bearing: ${Number(position.bearing).toFixed(2)}</p>` : ''}
                         ${position.speed != null ? `<p>Speed: ${Number(position.speed).toFixed(2)} km/h</p>` : ''}
                     </div>
                 `;

                // Create a new MapTiler GL JS popup with the content
                const popup = new Popup({ offset: 25 }).setHTML(popupContent);
                // Attach the popup to the marker
                marker.setPopup(popup);

                // Add the new marker to the map if the map instance exists
                 if (mapInstance) {
                    marker.addTo(mapInstance);
                 }
                // Store the new marker in the nextMarkers list
                nextMarkers[vehicleId] = marker;
            }
        });

        // Remove markers that are no longer present in the updated data
        Object.values(currentMarkers).forEach(marker => marker.remove());

        // Update the vehicleMarkers ref with the new set of markers
        vehicleMarkers.current = nextMarkers;

         // Cleanup function to remove all vehicle markers when dependencies change or component unmounts
         return () => {
             // Iterate over the current markers and remove them from the map
             Object.values(vehicleMarkers.current).forEach(marker => marker.remove());
             // Clear the vehicle markers reference object
             vehicleMarkers.current = {};
         };

    }, [realtimeData, showVehicles, isMapLoaded]); // Re-run effect when realtimeData, showVehicles, or isMapLoaded changes

    /**
     * Helper function to translate direction ID to a human-readable string.
     * @param directionId - The direction ID (0 or 1).
     * @returns A string representing the direction.
     */
    const getDirectionName = (directionId?: number): string => {
        if (directionId === undefined) return 'N/A';
        return directionId === 0 ? 'Outbound' : 'Inbound';
    };

    /**
     * Helper function to format schedule deviation into minutes.
     * @param deviation - The schedule deviation in seconds.
     * @returns A formatted string indicating schedule adherence.
     */
    const formatScheduleDeviation = (deviation?: number): string => {
        if (deviation === undefined || deviation === null) return 'N/A';
        const minutes = Math.round(deviation / 60);
        if (minutes === 0) return 'On time';
        return `${minutes > 0 ? '+' : ''}${minutes} min`;
    };

    /**
     * Helper function to get a human-readable description of congestion level.
     * @param level - The congestion level string.
     * @returns A descriptive string for the congestion level.
     */
    const getCongestionLevel = (level?: string): string => {
        if (!level) return 'N/A';
        const levels: { [key: string]: string } = {
            'UNKNOWN_CONGESTION_LEVEL': 'Unknown',
            'RUNNING_SMOOTHLY': 'Running Smoothly',
            'STOP_AND_GO': 'Stop and Go',
            'CONGESTION': 'Congested',
            'SEVERE_CONGESTION': 'Severely Congested'
        };
        return levels[level] || level;
    };

    /**
     * Helper function to get a human-readable description of occupancy status.
     * @param status - The occupancy status string.
     * @returns A descriptive string for the occupancy status.
     */
    const getOccupancyStatus = (status?: string): string => {
        if (!status) return 'N/A';
        const statuses: { [key: string]: string } = {
            'EMPTY': 'Empty',
            'MANY_SEATS_AVAILABLE': 'Many Seats Available',
            'FEW_SEATS_AVAILABLE': 'Few Seats Available',
            'STANDING_ROOM_ONLY': 'Standing Room Only',
            'CRUSHED_STANDING_ROOM_ONLY': 'Crushed Standing Room Only',
            'FULL': 'Full',
            'NOT_ACCEPTING_PASSENGERS': 'Not Accepting Passengers'
        };
        return statuses[status] || status;
    };

    /**
     * Helper function to get color based on schedule deviation.
     * @param deviation - The schedule deviation in seconds.
     * @returns A color string (hex code).
     */
    const getDeviationColor = (deviation?: number): string => {
        if (deviation === undefined || deviation === null) return '#ff4444';
        const minutes = Math.abs(deviation) / 60;
        if (minutes <= 1) return '#4CAF50';
        if (minutes <= 3) return '#FFC107';
        return '#FF4444';
    };

    /**
     * Helper function to determine if a vehicle marker should have a pulsing animation.
     * @param deviation - The schedule deviation in seconds.
     * @returns True if the marker should pulse, false otherwise.
     */
     const shouldPulse = (deviation?: number): boolean => {
         if (deviation === undefined || deviation === null) return false;
         const minutes = Math.abs(deviation) / 60;
         return minutes > 5;
     };

    /**
     * Helper function to create a custom HTML element for a vehicle marker.
     * Includes rotation and color based on deviation.
     * @param bearing - The vehicle's bearing for rotation.
     * @param deviation - The vehicle's schedule deviation.
     * @returns An object containing the created HTML element.
     */
    const createVehicleIconElement = (bearing: number, deviation?: number) => {
        const color = getDeviationColor(deviation);
        const pulse = shouldPulse(deviation) ? 'pulse' : '';
        // Create a div element for the icon
        const iconDiv = document.createElement('div');
        iconDiv.className = `vehicle-icon ${pulse}`;
        // Add inline styles for size, color, border, border-radius, and rotation
        iconDiv.style.cssText = `
            width: 12px;
            height: 12px;
            background-color: ${color};
            border: 2px solid white;
            border-radius: 50%;
            transform: rotate(${bearing}deg);
            cursor: pointer;
        `;
        return { element: iconDiv };
    };

    return (
        <div 
            className={`map-container ${className}`} 
            style={{ width: '100%', height: '100%', position: 'relative' }}
            data-testid="map-container"
        >
            {/* Map container */}
            <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
            
            {/* Legend */}
            <div className="map-legend">
                <h4>Vehicle Status</h4>
                <div className="legend-item">
                    <div className="legend-color" style={{ backgroundColor: '#4CAF50' }}></div>
                    <span>On Time (±1 min)</span>
                </div>
                <div className="legend-item">
                    <div className="legend-color" style={{ backgroundColor: '#FFC107' }}></div>
                    <span>Minor Delay (±3 min)</span>
                </div>
                <div className="legend-item">
                    <div className="legend-color" style={{ backgroundColor: '#FF4444' }}></div>
                    <span>Major Delay ({'>'}3 min)</span>
                </div>
            </div>
            
            {/* Error messages */}
            {mapError && (
                <div className="map-error">
                    {mapError}
                </div>
            )}
            {realtimeError && (
                <div className="error-message">
                    Real-time Error: {realtimeError}
                </div>
            )}
            {routeError && (
                <div className="info-message">
                    Route Error: {routeError}
                </div>
            )}
            {stopError && (
                <div className="info-message">
                    Stop Error: {stopError}
                </div>
            )}
        </div>
    );
};

export default RealtimeMap; 
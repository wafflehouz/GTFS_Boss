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
                    style: MapStyle.STREETS.NIGHT,
                    apiKey: MAPTILER_TOKEN,
                    center: center,
                    zoom: 12,
                    bearing: 0,
                    pitch: 30,
                    maxPitch: 60,
                    minPitch: 0,
                    maxZoom: 18,
                    minZoom: 5
                });

                // Add navigation control (zoom and rotation buttons) to the map
                mapInstance.addControl(new NavigationControl());

                // Store the map instance in the ref
                map.current = mapInstance;

                // Add 3D building layer after the map loads
                mapInstance.on('load', () => {
                    // Add 3D building layer
                    mapInstance.addLayer({
                        'id': '3d-buildings',
                        'source': 'composite',
                        'source-layer': 'building',
                        'filter': ['==', 'extrude', 'true'],
                        'type': 'fill-extrusion',
                        'minzoom': 12,
                        'paint': {
                            'fill-extrusion-color': '#2a2a2a',
                            'fill-extrusion-height': [
                                'interpolate',
                                ['linear'],
                                ['zoom'],
                                12, 0,
                                15, ['get', 'height']
                            ],
                            'fill-extrusion-base': [
                                'interpolate',
                                ['linear'],
                                ['zoom'],
                                12, 0,
                                15, ['get', 'min_height']
                            ],
                            'fill-extrusion-opacity': 0.6
                        }
                    });

                    setMapError(null);
                    setIsMapLoaded(true);
                });

                // Add event listener for missing style images
                mapInstance.on('styleimagemissing', (e) => {
                    // Workaround: Add a transparent 1x1 image if a style image is missing
                    if (mapInstance && !mapInstance.hasImage(e.id)) {
                         const transparentPixel = new Uint8Array([0, 0, 0, 0]);
                         mapInstance.addImage(e.id, { width: 1, height: 1, data: transparentPixel });
                    }
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
                        <div class="route-info">
                            <div style="display: flex; align-items: center; margin-bottom: 10px;">
                                ${colorPreview.outerHTML}
                                <h3>Route ${routeShortName}</h3>
                            </div>
                            <p>Route ID: ${routeId}</p>
                            <p>Description: ${routeLongName}</p>
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
                        <div class="stop-info">
                            <h3>${stopName}</h3>
                            <p>ID: ${stopId}</p>
                            ${stopDesc !== 'N/A' ? `<p>${stopDesc}</p>` : ''}
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
                         minzoom: 15,  // Changed to 15 to only show stops when zoomed in closer
                         paint: {
                             'circle-radius': 2,
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
        if (!map.current || !isMapLoaded || !showVehicles || !realtimeData || !realtimeData.vehicles) {
            // Remove all existing vehicle markers if map instance exists
            if (map.current) {
                Object.values(vehicleMarkers.current).forEach(marker => marker.remove());
            }
            // Clear the vehicle markers reference object
            vehicleMarkers.current = {};
            return;
        }

        const mapInstance = map.current;
        const vehiclesWithPositions = realtimeData.vehicles.filter(v => v.position);
        const currentMarkers = vehicleMarkers.current;
        const nextMarkers: { [key: string]: Marker } = {};

        // Create a GeoJSON source for clustering
        const vehicleSourceId = 'vehicles';
        const vehicleClusterLayerId = 'vehicle-clusters';
        const vehicleClusterCountLayerId = 'vehicle-cluster-count';
        const vehicleUnclusteredLayerId = 'vehicle-unclustered';

        // Add or update the vehicle source
        if (!mapInstance.getSource(vehicleSourceId)) {
            mapInstance.addSource(vehicleSourceId, {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: vehiclesWithPositions.map(vehicle => ({
                        type: 'Feature',
                        properties: {
                            id: vehicle.id,
                            bearing: vehicle.position?.bearing || 0,
                            deviation: vehicle.scheduleDeviation,
                            label: vehicle.label,
                            status: vehicle.currentStatus,
                            routeId: vehicle.trip?.routeId,
                            directionId: vehicle.trip?.directionId,
                            tripId: vehicle.trip?.tripId,
                            stopId: vehicle.stopId,
                            congestionLevel: vehicle.congestionLevel,
                            occupancyStatus: vehicle.occupancyStatus,
                            speed: vehicle.position?.speed
                        },
                        geometry: {
                            type: 'Point',
                            coordinates: [vehicle.position!.longitude, vehicle.position!.latitude]
                        }
                    }))
                },
                cluster: true,
                clusterMaxZoom: 11,
                clusterRadius: 90
            });

            // Add the cluster layer
            mapInstance.addLayer({
                id: vehicleClusterLayerId,
                type: 'circle',
                source: vehicleSourceId,
                filter: ['has', 'point_count'],
                paint: {
                    'circle-color': [
                        'step',
                        ['get', 'point_count'],
                        '#4CAF50',
                        5, '#FFC107',
                        10, '#FF4444'
                    ],
                    'circle-radius': [
                        'step',
                        ['get', 'point_count'],
                        20,
                        5, 30,
                        10, 40
                    ],
                    'circle-opacity': 0.8
                }
            });

            // Add the cluster count layer
            mapInstance.addLayer({
                id: vehicleClusterCountLayerId,
                type: 'symbol',
                source: vehicleSourceId,
                filter: ['has', 'point_count'],
                layout: {
                    'text-field': '{point_count_abbreviated}',
                    'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
                    'text-size': 12
                },
                paint: {
                    'text-color': '#ffffff'
                }
            });

            // Add the unclustered point layer
            mapInstance.addLayer({
                id: vehicleUnclusteredLayerId,
                type: 'circle',
                source: vehicleSourceId,
                filter: ['!', ['has', 'point_count']],
                paint: {
                    'circle-color': [
                        'case',
                        ['has', 'deviation'],
                        [
                            'case',
                            ['<=', ['abs', ['get', 'deviation']], 60], '#4CAF50',
                            ['<=', ['abs', ['get', 'deviation']], 180], '#FFC107',
                            '#FF4444'
                        ],
                        '#4CAF50'
                    ],
                    'circle-radius': 7,
                    'circle-stroke-width': 1,
                    'circle-stroke-color': '#ffffff'
                }
            });

            // Add click handler for individual vehicles
            mapInstance.on('click', vehicleUnclusteredLayerId, (e) => {
                const features = mapInstance.queryRenderedFeatures(e.point, {
                    layers: [vehicleUnclusteredLayerId]
                });
                
                if (features[0]) {
                    const props = features[0].properties;
                    const popupContent = `
                        <div class="vehicle-info">
                            <h3>Vehicle ${props.label || 'N/A'}</h3>
                            <p>Status: ${props.status || 'N/A'}</p>
                            <p>Route: ${props.routeId || 'N/A'}</p>
                            <p>Direction: ${getDirectionName(props.directionId)}</p>
                            <p>Schedule: ${formatScheduleDeviation(props.deviation)}</p>
                            ${props.congestionLevel ? `<p>Congestion: ${getCongestionLevel(props.congestionLevel)}</p>` : ''}
                            ${props.occupancyStatus ? `<p>Occupancy: ${getOccupancyStatus(props.occupancyStatus)}</p>` : ''}
                            <p>Trip ID: ${props.tripId || 'N/A'}</p>
                            <p>Stop ID: ${props.stopId || 'N/A'}</p>
                            ${props.bearing != null ? `<p>Bearing: ${Number(props.bearing).toFixed(2)}</p>` : ''}
                            ${props.speed != null ? `<p>Speed: ${Number(props.speed).toFixed(2)} km/h</p>` : ''}
                        </div>
                    `;

                    new Popup()
                        .setLngLat(e.lngLat)
                        .setHTML(popupContent)
                        .addTo(mapInstance);
                }
            });

            // Add mouse handlers for individual vehicles
            mapInstance.on('mouseenter', vehicleUnclusteredLayerId, () => {
                mapInstance.getCanvas().style.cursor = 'pointer';
            });
            mapInstance.on('mouseleave', vehicleUnclusteredLayerId, () => {
                mapInstance.getCanvas().style.cursor = '';
            });

            // Add click handler for clusters
            mapInstance.on('click', vehicleClusterLayerId, (e) => {
                const features = mapInstance.queryRenderedFeatures(e.point, {
                    layers: [vehicleClusterLayerId]
                });
                const clusterId = features[0].properties?.cluster_id;
                const source = mapInstance.getSource(vehicleSourceId) as any;
                source.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
                    if (err) return;
                    mapInstance.easeTo({
                        center: (features[0].geometry as any).coordinates,
                        zoom: zoom
                    });
                });
            });

            // Add mouse handlers for clusters
            mapInstance.on('mouseenter', vehicleClusterLayerId, () => {
                mapInstance.getCanvas().style.cursor = 'pointer';
            });
            mapInstance.on('mouseleave', vehicleClusterLayerId, () => {
                mapInstance.getCanvas().style.cursor = '';
            });
        } else {
            // Update the source data
            (mapInstance.getSource(vehicleSourceId) as any).setData({
                type: 'FeatureCollection',
                features: vehiclesWithPositions.map(vehicle => ({
                    type: 'Feature',
                    properties: {
                        id: vehicle.id,
                        bearing: vehicle.position?.bearing || 0,
                        deviation: vehicle.scheduleDeviation,
                        label: vehicle.label,
                        status: vehicle.currentStatus,
                        routeId: vehicle.trip?.routeId,
                        directionId: vehicle.trip?.directionId,
                        tripId: vehicle.trip?.tripId,
                        stopId: vehicle.stopId,
                        congestionLevel: vehicle.congestionLevel,
                        occupancyStatus: vehicle.occupancyStatus,
                        speed: vehicle.position?.speed
                    },
                    geometry: {
                        type: 'Point',
                        coordinates: [vehicle.position!.longitude, vehicle.position!.latitude]
                    }
                }))
            });
        }

        // Cleanup function
        return () => {
            if (mapInstance) {
                if (mapInstance.getLayer(vehicleClusterLayerId)) {
                    mapInstance.removeLayer(vehicleClusterLayerId);
                }
                if (mapInstance.getLayer(vehicleClusterCountLayerId)) {
                    mapInstance.removeLayer(vehicleClusterCountLayerId);
                }
                if (mapInstance.getLayer(vehicleUnclusteredLayerId)) {
                    mapInstance.removeLayer(vehicleUnclusteredLayerId);
                }
                if (mapInstance.getSource(vehicleSourceId)) {
                    mapInstance.removeSource(vehicleSourceId);
                }
            }
        };

    }, [realtimeData, showVehicles, isMapLoaded]);

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
            width: 14px;
            height: 14px;
            background-color: ${color};
            border: 1px solid white;
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
                <div className="legend-item">
                    <div className="legend-color no-data"></div>
                    <span>No Data</span>
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
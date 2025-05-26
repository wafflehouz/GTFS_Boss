import React, { useState, Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import './App.css';
import FileUpload from './components/FileUpload';
import ValidationResults from './components/ValidationResults';
import RealtimeMap from './components/RealtimeMap';
import type { RealtimeData, RealtimeMetrics, Alert, ValidationResults as ValidationResultsType } from './types';
import ServiceAlertsDisplay from './components/ServiceAlertsDisplay';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error: error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error in error boundary:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div style={{ border: '1px solid red', padding: '10px', margin: '20px 0' }}>
          <h2>Something went wrong in this section.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {/* <div>{this.state.errorInfo.componentStack}</div> */}
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  const [validationResults, setValidationResults] = useState<ValidationResultsType | undefined>(() => {
    // Try to load validation results from localStorage on initial render
    const savedResults = localStorage.getItem('validationResults');
    return savedResults ? JSON.parse(savedResults) : undefined;
  });
  const [showRoutes, setShowRoutes] = useState<boolean>(true);
  const [showStops, setShowStops] = useState<boolean>(true);
  const [showVehicles, setShowVehicles] = useState<boolean>(true);
  const [realtimeMetrics, setRealtimeMetrics] = useState<RealtimeMetrics | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [serviceAlerts, setServiceAlerts] = useState<Alert[]>([]);

  const handleValidationResults = (results: ValidationResultsType) => {
    setValidationResults(results);
    // Save validation results to localStorage
    localStorage.setItem('validationResults', JSON.stringify(results));
  };

  const handleRealtimeDataFetched = (data: RealtimeData | null) => {
    if (data) {
      setRealtimeMetrics(data.realtimeMetrics);
      setServiceAlerts(data.alerts || []);
      setMetricsError(null);
    } else {
      setRealtimeMetrics(null);
      setServiceAlerts([]);
      setMetricsError('Failed to fetch real-time data');
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>GTFS Boss</h1>
      </header>
      
      <main className="app-main">
        <div className="upload-section">
          <FileUpload onValidationResults={handleValidationResults} />
          {validationResults && <ValidationResults result={validationResults} />}
        </div>

        <div className="map-section">
          <div className="map-controls">
             <label>
               <input type="checkbox" checked={showRoutes} onChange={(e) => setShowRoutes(e.target.checked)} />
               Show Routes
             </label>
             <label>
               <input type="checkbox" checked={showStops} onChange={(e) => setShowStops(e.target.checked)} />
               Show Stops
             </label>
             <label>
               <input type="checkbox" checked={showVehicles} onChange={(e) => setShowVehicles(e.target.checked)} />
               Show Vehicles
             </label>
          </div>
          <RealtimeMap
            className="realtime-map"
            validationResults={validationResults}
            showRoutes={showRoutes}
            showStops={showStops}
            showVehicles={showVehicles}
            onRealtimeDataFetched={handleRealtimeDataFetched}
          />
        </div>

        {(realtimeMetrics || metricsError) && (
          <div className="realtime-metrics-section">
            <h2>Real-time Performance</h2>
            {metricsError && (
              <div className="error-message">
                Error fetching real-time metrics: {metricsError}
              </div>
            )}
            {realtimeMetrics && (
              <div className="realtime-metrics">
                <h4>Metrics Summary</h4>
                <p>Total Vehicles Reporting Deviation: {realtimeMetrics.total_vehicles_reporting_deviation}</p>
                <p>On-Time Vehicles: {realtimeMetrics.on_time_vehicles}</p>
                <p>On-Time Percentage: {realtimeMetrics.on_time_percentage}%</p>
                <p>Early Vehicles: {realtimeMetrics.early_vehicles_count}</p>
                <p>Late Vehicles: {realtimeMetrics.late_vehicles_count}</p>
                <p>Average Early Deviation: {formatScheduleDeviation(-realtimeMetrics.average_early_deviation_seconds)}</p>
                <p>Average Late Deviation: {formatScheduleDeviation(realtimeMetrics.average_late_deviation_seconds)}</p>
                <p>Average Overall Deviation: {formatScheduleDeviation(realtimeMetrics.average_overall_deviation_seconds)}</p>
              </div>
            )}
          </div>
        )}

        <div className="service-alerts-section">
          <ServiceAlertsDisplay alerts={serviceAlerts} />
        </div>
      </main>
    </div>
  );
}

const formatScheduleDeviation = (deviation?: number): string => {
  if (deviation === undefined || deviation === null) return 'N/A';
  const minutes = Math.round(deviation / 60);
  if (minutes === 0) return 'On time';
  return `${minutes > 0 ? '+' : ''}${minutes} min`;
};

export default App;

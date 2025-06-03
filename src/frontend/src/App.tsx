import React, { useState, Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import './App.css';
import FileUpload from './components/FileUpload';
import ValidationResults from './components/ValidationResults';
import RealtimeMap from './components/RealtimeMap';
import Navigation from './components/Navigation';
import type { RealtimeData, RealtimeMetrics, Alert, ValidationResults as ValidationResultsType } from './types';
import ServiceAlertsSidebar from './components/ServiceAlertsSidebar';
import { useServiceAlerts } from './hooks/useServiceAlerts';
import ValidationPopup from './components/ValidationPopup';
import RealtimeMetricsPopup from './components/RealtimeMetricsPopup';

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
  const { alerts, loading, error } = useServiceAlerts();
  const [showVehicles, setShowVehicles] = useState(true);
  const [showStops, setShowStops] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  const [validationResults, setValidationResults] = useState<any>(null);
  const [isValidationOpen, setIsValidationOpen] = useState(false);
  const [isMetricsOpen, setIsMetricsOpen] = useState(false);
  const [realtimeMetrics, setRealtimeMetrics] = useState<RealtimeMetrics | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  const handleValidationResults = (results: any) => {
    setValidationResults(results);
  };

  const handleRealtimeDataFetched = (data: RealtimeData | null) => {
    if (data) {
      setRealtimeMetrics(data.realtimeMetrics);
      setMetricsError(null);
    } else {
      setRealtimeMetrics(null);
      setMetricsError('Failed to fetch real-time data');
    }
  };

  return (
    <div className="app">
      <Navigation
        showVehicles={showVehicles}
        showStops={showStops}
        showRoutes={showRoutes}
        onToggleVehicles={() => setShowVehicles(!showVehicles)}
        onToggleStops={() => setShowStops(!showStops)}
        onToggleRoutes={() => setShowRoutes(!showRoutes)}
        onValidationClick={() => setIsValidationOpen(true)}
        onMetricsClick={() => setIsMetricsOpen(true)}
      />
      
      <main className="app-main">
        <section className="map-section">
          <RealtimeMap
            className="realtime-map"
            validationResults={validationResults}
            showVehicles={showVehicles}
            showStops={showStops}
            showRoutes={showRoutes}
            onRealtimeDataFetched={handleRealtimeDataFetched}
          />
        </section>
      </main>

      <div className="content-section">
        <div className="service-alerts-section">
          <ServiceAlertsSidebar alerts={alerts} />
        </div>
      </div>

      <ValidationPopup
        isOpen={isValidationOpen}
        onClose={() => setIsValidationOpen(false)}
        validationResults={validationResults}
        onValidationResults={handleValidationResults}
      />

      <RealtimeMetricsPopup
        isOpen={isMetricsOpen}
        onClose={() => setIsMetricsOpen(false)}
        metrics={realtimeMetrics}
      />
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

import React from 'react';
import './Navigation.css';
import Options from './Options';
import Tools from './Tools';

interface NavigationProps {
  showVehicles: boolean;
  showStops: boolean;
  showRoutes: boolean;
  onToggleVehicles: () => void;
  onToggleStops: () => void;
  onToggleRoutes: () => void;
  onValidationClick: () => void;
  onMetricsClick: () => void;
}

const Navigation: React.FC<NavigationProps> = ({
  showVehicles,
  showStops,
  showRoutes,
  onToggleVehicles,
  onToggleStops,
  onToggleRoutes,
  onValidationClick,
  onMetricsClick,
}) => {
  return (
    <nav className="nav">
      <div className="nav-brand">
        <h1>GTFS Boss</h1>
      </div>
      <div className="nav-menu">
        <Tools 
          onValidationClick={onValidationClick}
          onMetricsClick={onMetricsClick}
        />
        <Options
          showVehicles={showVehicles}
          showStops={showStops}
          showRoutes={showRoutes}
          onToggleVehicles={onToggleVehicles}
          onToggleStops={onToggleStops}
          onToggleRoutes={onToggleRoutes}
        />
      </div>
    </nav>
  );
};

export default Navigation; 
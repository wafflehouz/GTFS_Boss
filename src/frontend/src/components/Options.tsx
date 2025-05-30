import React, { useState } from 'react';
import './Options.css';

interface OptionsProps {
  showVehicles: boolean;
  showStops: boolean;
  showRoutes: boolean;
  onToggleVehicles: () => void;
  onToggleStops: () => void;
  onToggleRoutes: () => void;
}

const Options: React.FC<OptionsProps> = ({
  showVehicles,
  showStops,
  showRoutes,
  onToggleVehicles,
  onToggleStops,
  onToggleRoutes,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="options-container">
      <button 
        className="options-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        Options
      </button>
      {isOpen && (
        <div className="options-dropdown">
          <div className="options-section">
            <h3>Map Layers</h3>
            <div className="options-controls">
              <label className="option-item">
                <input
                  type="checkbox"
                  checked={showVehicles}
                  onChange={onToggleVehicles}
                />
                Vehicles
              </label>
              <label className="option-item">
                <input
                  type="checkbox"
                  checked={showStops}
                  onChange={onToggleStops}
                />
                Stops
              </label>
              <label className="option-item">
                <input
                  type="checkbox"
                  checked={showRoutes}
                  onChange={onToggleRoutes}
                />
                Routes
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Options; 
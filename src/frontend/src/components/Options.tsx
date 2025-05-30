import React, { useState, useRef, useEffect } from 'react';
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
  const timeoutRef = useRef<number | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = window.setTimeout(() => {
      setIsOpen(false);
    }, 200); // Small delay to prevent accidental closing
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div 
      className="options-container"
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button 
        className="options-button"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        Layers
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
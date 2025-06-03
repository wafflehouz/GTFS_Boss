import React, { useState, useRef, useEffect } from 'react';
import './Tools.css';

interface ToolsProps {
  onValidationClick: () => void;
  onMetricsClick: () => void;
}

const Tools: React.FC<ToolsProps> = ({ onValidationClick, onMetricsClick }) => {
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

  const handleValidationClick = () => {
    onValidationClick();
    setIsOpen(false); // Close the tools menu after clicking
  };

  const handleMetricsClick = () => {
    onMetricsClick();
    setIsOpen(false); // Close the tools menu after clicking
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
      className="tools-container"
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button 
        className="tools-button"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        Tools
      </button>
      {isOpen && (
        <div className="tools-dropdown">
          <div className="tools-controls">
            <button className="tool-item" onClick={handleValidationClick}>
              GTFS Validation
            </button>
            <button className="tool-item" onClick={handleMetricsClick}>
              RT Metrics
            </button>
            <button className="tool-item coming-soon">
              Trip Planning Analysis
              <span className="coming-soon-badge">Coming Soon</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tools; 
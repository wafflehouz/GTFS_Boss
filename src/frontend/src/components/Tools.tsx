import React, { useState, useRef, useEffect } from 'react';
import './Tools.css';

interface ToolsProps {
  // Add any props needed for tools functionality
}

const Tools: React.FC<ToolsProps> = () => {
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
            <button className="tool-item">
              GTFS Validation
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
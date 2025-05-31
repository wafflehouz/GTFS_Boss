import React, { useState } from 'react';
import { FaBell } from 'react-icons/fa';
import ServiceAlertsDisplay from './ServiceAlertsDisplay';
import './ServiceAlertsSidebar.css';

interface ServiceAlertsSidebarProps {
  alerts: any[]; // Replace 'any' with your actual alerts type
}

const ServiceAlertsSidebar: React.FC<ServiceAlertsSidebarProps> = ({ alerts }) => {
  const [isOpen, setIsOpen] = useState(true);
  
  console.log('ServiceAlertsSidebar received alerts:', alerts); // Debug log

  return (
    <aside className={`service-alerts-sidebar ${isOpen ? 'open' : 'collapsed'}`}>
      <button
        className="toggle-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Collapse service alerts' : 'Expand service alerts'}
      >
        <FaBell />
        {!isOpen && alerts.length > 0 && (
          <span className="alert-badge">{alerts.length}</span>
        )}
      </button>
      {isOpen && <ServiceAlertsDisplay alerts={alerts} />}
    </aside>
  );
};

export default ServiceAlertsSidebar; 
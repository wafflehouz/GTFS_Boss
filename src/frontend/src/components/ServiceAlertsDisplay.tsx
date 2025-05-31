import React from 'react';
import type { Alert } from '../types';
import './ServiceAlertsDisplay.css';

interface ServiceAlertsDisplayProps {
  alerts: Alert[];
}

const ServiceAlertsDisplay: React.FC<ServiceAlertsDisplayProps> = ({ alerts }) => {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="service-alerts-container">
        <h4>Service Alerts</h4>
        <p className="no-alerts">No active service alerts</p>
      </div>
    );
  }

  return (
    <div className="service-alerts-container">
      <h4>Service Alerts</h4>
      <div className="alerts-list">
        {alerts.map(alert => (
          <div key={alert.id} className="alert-item">
            <div className="alert-header">
              <h5>{alert.headerText || 'No Header'}</h5>
              {alert.cause && <span className="alert-cause">{alert.cause}</span>}
            </div>
            {alert.descriptionText && (
              <p className="alert-description">{alert.descriptionText}</p>
            )}
            {alert.effect && (
              <p className="alert-effect">
                <strong>Effect:</strong> {alert.effect}
              </p>
            )}
            {alert.informedEntities && alert.informedEntities.length > 0 && (
              <div className="alert-entities">
                <strong>Affected:</strong>
                <ul>
                  {alert.informedEntities.map((entity, index) => (
                    <li key={index}>
                      {entity.routeId && <span className="entity-route">Route {entity.routeId}</span>}
                      {entity.stopId && <span className="entity-stop">Stop {entity.stopId}</span>}
                      {entity.trip?.tripId && <span className="entity-trip">Trip {entity.trip.tripId}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {alert.url && (
              <a 
                href={alert.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="alert-link"
              >
                More Information
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ServiceAlertsDisplay; 
import React from 'react';
import type { Alert } from '../types';

interface ServiceAlertsDisplayProps {
  alerts: Alert[];
}

const ServiceAlertsDisplay: React.FC<ServiceAlertsDisplayProps> = ({ alerts }) => {
  if (!alerts || alerts.length === 0) {
    return null; // Don't render if there are no alerts
  }

  return (
    <div className="service-alerts-container">
      <h4>Service Alerts</h4>
      {alerts.map(alert => (
        <div key={alert.id} className="alert-item">
          <h5>{alert.headerText || 'No Header'}</h5>
          {alert.descriptionText && <p>{alert.descriptionText}</p>}
          {alert.cause && <p>Cause: {alert.cause}</p>}
          {alert.effect && <p>Effect: {alert.effect}</p>}
          {alert.url && (
            <p>
              More Info: <a href={alert.url} target="_blank" rel="noopener noreferrer">{alert.url}</a>
            </p>
          )}
          {alert.informedEntities && alert.informedEntities.length > 0 && (
            <p>
              Affected Entities:
              {alerts.map((alert, index) => (
                <span key={index}>
                  {alert.informedEntities?.map((entity, entityIndex) => (
                    <span key={entityIndex}>
                      {entity.routeId && ` Route ${entity.routeId}`}
                      {entity.stopId && ` Stop ${entity.stopId}`}
                      {entity.trip?.tripId && ` Trip ${entity.trip.tripId}`}
                      {entityIndex < (alert.informedEntities?.length || 0) - 1 ? ', ' : ''}
                    </span>
                  ))}
                </span>
              ))}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

export default ServiceAlertsDisplay; 
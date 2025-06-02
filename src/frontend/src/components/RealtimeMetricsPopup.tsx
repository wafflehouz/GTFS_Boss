import React from 'react';
import './RealtimeMetricsPopup.css';
import type { RealtimeMetrics } from '../types';

interface RealtimeMetricsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  metrics: RealtimeMetrics | null;
}

const formatTimeDeviation = (seconds: number): string => {
  const minutes = Math.floor(Math.abs(seconds) / 60);
  const remainingSeconds = Math.floor(Math.abs(seconds) % 60);
  const sign = seconds < 0 ? '-' : '+';
  return `${sign}${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const RealtimeMetricsPopup: React.FC<RealtimeMetricsPopupProps> = ({
  isOpen,
  onClose,
  metrics
}) => {
  if (!isOpen) return null;

  return (
    <div className="popup-overlay">
      <div className="realtime-metrics-popup">
        <div className="popup-header">
          <h2>Real-Time Metrics</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="popup-content">
          {metrics ? (
            <div className="metrics-grid">
              <div className="metric-card">
                <h3>Vehicle Status</h3>
                <div className="metric-value">{metrics.total_vehicles_reporting_deviation}</div>
                <div className="metric-label">Total Vehicles</div>
              </div>
              <div className="metric-card">
                <h3>OTP</h3>
                <div className="metric-value">{metrics.on_time_percentage.toFixed(1)}%</div>
                <div className="metric-label">On-Time Rate</div>
              </div>
              <div className="metric-card">
                <h3>Early Vehicles</h3>
                <div className="metric-value">{metrics.early_vehicles_count}</div>
                <div className="metric-label">Ahead of Schedule</div>
              </div>
              <div className="metric-card">
                <h3>Late Vehicles</h3>
                <div className="metric-value">{metrics.late_vehicles_count}</div>
                <div className="metric-label">Behind Schedule</div>
              </div>
              <div className="metric-card">
                <h3>Average Early</h3>
                <div className="metric-value">{formatTimeDeviation(-metrics.average_early_deviation_seconds)}</div>
                <div className="metric-label">Early Deviation</div>
              </div>
              <div className="metric-card">
                <h3>Average Late</h3>
                <div className="metric-value">{formatTimeDeviation(metrics.average_late_deviation_seconds)}</div>
                <div className="metric-label">Late Deviation</div>
              </div>
            </div>
          ) : (
            <div className="no-metrics">
              <p>No real-time metrics available</p>
              <p>Please wait for vehicle data to be collected</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RealtimeMetricsPopup; 
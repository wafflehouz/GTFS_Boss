import { useState, useEffect } from 'react';
import type { Alert } from '../types';

export const useServiceAlerts = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/v1/realtime/vehicles');
        if (!response.ok) {
          throw new Error('Failed to fetch service alerts');
        }
        const data = await response.json();
        console.log('Service Alerts Response:', data); // Debug log
        setAlerts(data.alerts || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching alerts:', err); // Debug log
        setError(err instanceof Error ? err.message : 'Failed to fetch service alerts');
        setAlerts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return { alerts, loading, error };
}; 
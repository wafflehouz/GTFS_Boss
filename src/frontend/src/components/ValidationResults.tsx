import React from 'react';

// Define nested types for better readability and type safety
interface FeedInfo {
  feed_publisher_name?: string;
  feed_lang?: string;
  feed_version?: string;
  feed_start_date?: string;
  feed_end_date?: string;
  feed_contact_email?: string;
  feed_contact_url?: string;
}

interface Counts {
  Agencies: number;
  Routes: number;
  Trips: number;
  Stops: number;
  Stations: number;
  Entrances: number;
  "Generic nodes": number;
  "Boarding areas": number;
  Pathways: number;
  Levels: number;
  Shapes: number;
  Transfers: number;
  "Service Periods": number;
  "Fare Attributes": number;
}

interface ServiceDays {
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
}

interface ServiceHours {
  earliest_service: string;
  latest_service: string;
  service_hours: number;
}

interface ServiceDates {
  service_days?: ServiceDays;
  service_hours?: ServiceHours;
  daily_service_counts?: ServiceDays; // This seems like a duplicate based on the backend, review if needed
  total_distinct_service_days?: number;
}

interface RouteColorSummary {
  route_color: string; // The background color
  count: number; // Number of routes with this color
  sample_text_color: string; // A sample text color for contrast
}

interface Metrics {
  Counts?: Counts;
  "Service Dates"?: ServiceDates;
  "Route Colors"?: RouteColorSummary[]; // Updated to use RouteColorSummary array
}

interface Summary {
  overall_status: string;
  feed_health_score: number;
  key_metrics?: { // key_metrics can be undefined
    total_stops: number;
    total_routes: number;
    total_trips: number;
    service_days: number;
    service_hours: number;
  };
  critical_issues: Array<{ message: string }>;
  recommendations: string[];
}

interface ValidationResultsProps {
  result: { // Result object can be null, but if not null, it has these potential properties
    is_valid: boolean;
    errors: Array<{ message: string }>;
    warnings: Array<{ message: string }>;
    feed_info?: FeedInfo; // Use FeedInfo type
    metrics?: Metrics; // Use Metrics type
    summary?: Summary; // Use Summary type
  } | null; // result itself can be null
}

// Define a type alias for the keys of the Counts object using the new type alias
type CountKeys = keyof Counts; // Now directly use the Counts interface

const ValidationResults: React.FC<ValidationResultsProps> = ({ result }) => {
  if (!result) return null; // Handle null result early

  // Function to safely get a count metric, returning 0 if the path doesn't exist
  // We use optional chaining to safely access nested properties
  const getCount = (metricName: CountKeys): number => {
      return result.metrics?.Counts?.[metricName] || 0; // Safely access using optional chaining
  };

  const handleDownload = async (format: 'json' | 'csv') => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/report?format=${format}`);

      if (!response.ok) {
        // Attempt to read error detail from response body
        let errorDetail = `Failed to download report: ${response.statusText}`;
        try {
            const errorData = await response.json();
            if (errorData && errorData.detail) {
                errorDetail = errorData.detail;
            }
        } catch (jsonError) {
            console.error("Failed to parse error response as JSON:", jsonError);
            // If JSON parsing fails, maybe the response was plain text or HTML
             try {
                 const textError = await response.text();
                 if (textError) {
                     errorDetail = `Failed to download report: ${response.statusText} - ${textError.substring(0, 100)}...`; // Limit length
                 }
             } catch (textErrorRead) {
                  console.error("Failed to read error response as text:", textErrorRead);
             }
        }

        throw new Error(errorDetail);
      }

      if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'gtfs_report.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      } else {
        // Assuming JSON is always formatted nicely for download
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'gtfs_report.json';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      // Optionally update UI to show download error, e.g., using state
      alert(`Download failed: ${(error as Error).message}`);
    }
  };

  return (
    <div className="validation-results">
      <div className="report-header">
        <h3>Validation Report</h3>
        <div className="download-buttons">
          {/* Temporarily disable download until backend supports report retrieval without re-upload */}
          <button onClick={() => handleDownload('json')} className="download-button">
             Download JSON 
           </button> 
           <button onClick={() => handleDownload('csv')} className="download-button">
             Download CSV 
           </button> 
           {/* <p>Download options coming soon...</p> */}
        </div>
      </div>

      {/* Rendering logic for different sections based on the new structure */}

      {/* Counts Section */}
      {result.metrics?.Counts && ( // Use optional chaining here
        <div className="counts-section">
          <h4>Counts</h4>
          <table>
            <thead>
              <tr>
                <th>GTFS Type</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Agencies</td><td>{getCount('Agencies')}</td></tr>
              <tr><td>Routes</td><td>{getCount('Routes')}</td></tr>
              <tr><td>Trips</td><td>{getCount('Trips')}</td></tr>
              <tr><td>Stops</td><td>{getCount('Stops')}</td></tr>
              <tr><td>Stations</td><td>{getCount('Stations')}</td></tr>
              <tr><td>Entrances</td><td>{getCount('Entrances')}</td></tr>
              <tr><td>Generic nodes</td><td>{getCount('Generic nodes')}</td></tr>
              <tr><td>Boarding areas</td><td>{getCount('Boarding areas')}</td></tr>
              <tr><td>Pathways</td><td>{getCount('Pathways')}</td></tr>
              <tr><td>Levels</td><td>{getCount('Levels')}</td></tr>
              <tr><td>Shapes</td><td>{getCount('Shapes')}</td></tr>
              <tr><td>Transfers</td><td>{getCount('Transfers')}</td></tr>
              <tr><td>Service Periods</td><td>{getCount('Service Periods')}</td></tr>
              <tr><td>Fare Attributes</td><td>{getCount('Fare Attributes')}</td></tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Service Dates Section */}
      {result.metrics?.["Service Dates"] && (
        <div className="service-dates-section">
          <h4>Service Dates</h4>
          
          {/* Service Days */}
          {result.metrics["Service Dates"].service_days && (
            <div className="service-days">
              <h5>Service Days</h5>
              <table>
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Services</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(result.metrics["Service Dates"].service_days).map(([day, count]) => (
                    <tr key={day}>
                      <td>{day.charAt(0).toUpperCase() + day.slice(1)}</td>
                      <td>{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Service Hours */}
          {result.metrics["Service Dates"].service_hours && (
            <div className="service-hours">
              <h5>Service Hours</h5>
              <p>Earliest Service: {result.metrics["Service Dates"].service_hours.earliest_service}</p>
              <p>Latest Service: {result.metrics["Service Dates"].service_hours.latest_service}</p>
              <p>Total Service Hours: {result.metrics["Service Dates"].service_hours.service_hours.toFixed(1)}</p>
            </div>
          )}
          
          {/* Service Coverage Dates */}
          {result.feed_info && ( // Use feed_info for overall dates
             <div className="service-coverage-dates">
               <h5>Overall Service Dates</h5>
               <p>Start Date: {result.feed_info.feed_start_date || 'N/A'}</p>
               <p>End Date: {result.feed_info.feed_end_date || 'N/A'}</p>
             </div>
          )}
        </div>
      )}

      {/* Route Colors Section */}
      {result.metrics?.["Route Colors"] && result.metrics["Route Colors"].length > 0 && (
        <div className="route-colors-section">
          <h4>Route Colors</h4>
          <div className="color-samples">
            {result.metrics["Route Colors"].map((colorEntry, index) => (
              <span 
                key={index} 
                style={{
                  backgroundColor: colorEntry.route_color.startsWith('#') ? colorEntry.route_color : `#${colorEntry.route_color}`,
                  color: colorEntry.sample_text_color.startsWith('#') ? colorEntry.sample_text_color : `#${colorEntry.sample_text_color}`,
                  padding: '4px 8px',
                  margin: '4px',
                  borderRadius: '4px',
                  display: 'inline-block',
                  fontWeight: 'bold',
                }}
              >
                SAMPLE ({colorEntry.count} routes)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Feed Info Section - Adjusted to use data from result.feed_info */}
      {result.feed_info && ( // Use optional chaining here
        <div className="feed-info">
          <h4>Feed Information</h4>
          <p>Publisher name: {result.feed_info.feed_publisher_name || 'N/A'}</p>
          <p>Language: {result.feed_info.feed_lang || 'N/A'}</p>
          <p>Feed version: {result.feed_info.feed_version || 'N/A'}</p>
          <p>Start Date: {result.feed_info.feed_start_date || 'N/A'}</p>
          <p>End Date: {result.feed_info.feed_end_date || 'N/A'}</p>
          <p>Contact email: {result.feed_info.feed_contact_email || 'N/A'}</p>
          <p>Contact URL: {result.feed_info.feed_contact_url || 'N/A'}</p>
        </div>
      )}

      {/* Summary Section - Adjusted to use Counts from metrics */}
      {result.summary && ( // Use optional chaining here
        <div className="summary-section">
          <h4>Summary</h4>
          <div className="health-score">
            <p>Overall Status: <span className={result.summary.overall_status}>{result.summary.overall_status}</span></p>
            {/* Safely access health score */} 
            <p>Health Score: <span className="score">{(result.summary.feed_health_score || 0).toFixed(1)}%</span></p>
          </div>

          <div className="key-metrics">
            <h5>Key Metrics</h5>
            <div className="metrics-grid">
              <div className="metric">
                 {/* Safely access total stops count */}
                <span className="metric-value">{result.summary.key_metrics?.total_stops || 0}</span> {/* Added optional chaining */}
                <span className="metric-label">Stops</span>
              </div>
              <div className="metric">
                 {/* Safely access total routes count */}
                <span className="metric-value">{result.summary.key_metrics?.total_routes || 0}</span> {/* Added optional chaining */}
                <span className="metric-label">Routes</span>
              </div>
              <div className="metric">
                 {/* Safely access total trips count */}
                <span className="metric-value">{result.summary.key_metrics?.total_trips || 0}</span> {/* Added optional chaining */}
                <span className="metric-label">Trips</span>
              </div>
              <div className="metric">
                 {/* Safely access service days count */}
                <span className="metric-value">{result.summary.key_metrics?.service_days || 0}</span> {/* Added optional chaining */}
                <span className="metric-label">Service Days</span>
              </div>
              <div className="metric">
                 {/* Safely access service hours count */}
                <span className="metric-value">{result.summary.key_metrics?.service_hours?.toFixed(1) || 0}</span> {/* Added optional chaining */}
                <span className="metric-label">Service Hours</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Errors Section */}
      {result.errors && result.errors.length > 0 && ( // Use optional chaining here
        <div className="errors-section">
          <h4 className="error">Errors</h4>
          <ul>
            {result.errors.map((error, index) => (
              <li key={index} className="error">{error.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings Section */}
       {result.warnings && result.warnings.length > 0 && ( // Use optional chaining here
         <div className="warnings-section">
           <h4 className="warning">Warnings</h4>
           <ul>
             {result.warnings.map((warning, index) => (
               <li key={index} className="warning">{warning.message}</li>
             ))}
           </ul>
         </div>
       )}

      {/* Recommendations Section */}
       {result.summary?.recommendations && result.summary.recommendations.length > 0 && ( // Use optional chaining here
         <div className="recommendations-section">
           <h4>Recommendations</h4>
           <ul>
             {result.summary.recommendations.map((rec, index) => (
               <li key={index}>{rec}</li>
             ))}
           </ul>
         </div>
       )}

    </div>
  );
};

export default ValidationResults; 